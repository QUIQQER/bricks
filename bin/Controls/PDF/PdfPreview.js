define('package/quiqqer/bricks/bin/Controls/PDF/PdfPreview', [

    'qui/QUI',
    'qui/controls/Control',
    'Locale',

    'css!package/quiqqer/bricks/bin/Controls/PDF/PdfPreview.css'

], function (QUI, QUIControl, QUILocale) {
    "use strict";

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/PDF/PdfPreview',

        Binds: [
            '$onInject',
            '$onImport',
            '$onDestroy',
            'handleOpenPageClick',
            'openNextPage',
            'openPrevPage'
        ],

        options: {
            pdf: false,
            pageNum: 0
        },

        initialize: function (options) {
            this.parent(options);
            this.currentPage = 0;
            this.maxPage = 0;
            this.NextBtn = null;
            this.PrevBtn = null;
            this.pdfFile = '';
            this.sheets = [];
            this.isLoading = false;
            this.$requestedPage = 0;
            this.$pdf = null;
            this.$loadingTask = null;
            this.$loadPromise = null;
            this.$pagePromise = null;
            this.$renderTask = null;
            this.$thumbnailTask = null;
            this.$observer = null;
            this.$thumbnailObserver = null;
            this.$thumbnailQueue = [];
            this.$renderingThumbnails = false;
            this.$destroyed = false;
            this.$animations = new Set();

            this.addEvents({
                onInject: this.$onInject,
                onImport: this.$onImport,
                onDestroy: this.$onDestroy
            });
        },

        $onInject: function () {
            const container = this.getElm();
            this.pdfFile = this.getAttribute('pdf');

            container.setAttribute('data-qui', 'package/quiqqer/bricks/bin/Controls/PDF/PdfPreview');
            container.setAttribute('data-name', 'quiqqer-bricks-pdf-preview');
            container.classList.add('quiqqer-bricks-pdfPreview');

            container.innerHTML = `
               <div class="container">
                   <div class="preview" data-name="preview">
                        <div data-name="loader" class="skeleton-loader" style="width: 100%; height: 100%; display: grid; place-items: center;">
                            <div style="text-align: center; opacity: 0.25;">
                                <i class="fa-regular fa-file-pdf" aria-hidden="true" style="font-size: clamp(2rem, 10vw, 5rem); margin-bottom: 1rem;"></i>
                                <div>${QUILocale.get('quiqqer/bricks', 'pdfPreview.brick.frontend.loading.title')}</div>
                            </div>
                        </div>
                    </div>
                    <div class="sheets" data-name="sheets"></div>
                </div>
            `;

            this.PrevBtn = document.createElement('button');
            this.PrevBtn.setAttribute('data-name', 'prev');
            this.PrevBtn.setAttribute('class', 'btn btn-icon btn-rounded btn--prev');
            this.PrevBtn.innerHTML = '<i class="fa-solid fa-angle-left" aria-hidden="true"></i>';

            this.PrevBtn.addEventListener('click', () => {
                this.handleOpenPageClick('prev');
            });

            this.NextBtn = document.createElement('button');
            this.NextBtn.setAttribute('data-name', 'next');
            this.NextBtn.setAttribute('class', 'btn btn-icon btn-rounded btn--next');
            this.NextBtn.innerHTML = '<i class="fa-solid fa-angle-right" aria-hidden="true"></i>';
            this.NextBtn.addEventListener('click', () => {
                this.handleOpenPageClick('next');
            });

            container.querySelector('[data-name="preview"]').appendChild(this.PrevBtn);
            container.querySelector('[data-name="preview"]').appendChild(this.NextBtn);

            const maxPages = this.getAttribute('pageNum');

            if (maxPages > 0) {
                let i = 1;
                for (i; i <= maxPages; i++) {
                    const sheet = document.createElement('button');
                    sheet.type = 'button';
                    sheet.disabled = true;
                    sheet.setAttribute('data-name', 'sheet');
                    sheet.setAttribute('class', 'sheet');
                    sheet.innerHTML = `<span data-name="loader" class="skeleton-loader" aria-hidden="true" style="width: 100%; height: 100%;"></span>`;
                    container.querySelector('[data-name="sheets"]').appendChild(sheet);
                }
            }

            this.initPdfLazyLoad(container);
        },

        $onImport: function() {

            const container = this.getElm();
            this.pdfFile = container.getAttribute('data-qui-options-pdffile');

            this.NextBtn = container.querySelector('[data-name="next"]');
            this.PrevBtn = container.querySelector('[data-name="prev"]');

            if (this.NextBtn) {
                this.NextBtn.addEventListener('click', () => {
                    this.handleOpenPageClick('next');
                });
            }

            if (this.PrevBtn) {
                this.PrevBtn.addEventListener('click', () => {
                    this.handleOpenPageClick('prev');
                });
            }

            this.initPdfLazyLoad(container);
        },

        /**
         * Keep loading lazy, but share one document between all canvases.
         */
        initPdfLazyLoad: function (container) {
            this.PrevBtn.type = 'button';
            this.NextBtn.type = 'button';
            this.PrevBtn.setAttribute('aria-label', QUILocale.get('quiqqer/bricks', 'pdfPreview.previous'));
            this.NextBtn.setAttribute('aria-label', QUILocale.get('quiqqer/bricks', 'pdfPreview.next'));
            this.disableButtons();

            this.$status = container.querySelector('[data-name="status"]');

            if (!this.$status) {
                this.$status = document.createElement('p');
                this.$status.className = 'quiqqer-bricks-pdfPreview__status';
                this.$status.setAttribute('data-name', 'status');
                this.$status.setAttribute('role', 'status');
                container.appendChild(this.$status);
            }

            this.$observer = new IntersectionObserver((entries) => {
                if (entries.some(entry => entry.isIntersecting)) {
                    this.$observer.disconnect();
                    this.loadPdf();
                }
            }, {threshold: 0});

            this.$observer.observe(container);
        },

        loadPdf: function () {
            if (!this.$loadPromise) {
                this.$loadPromise = this.$loadDocument().catch(error => {
                    if (!this.$destroyed) {
                        this.$showError(error);
                    }
                });
            }

            return this.$loadPromise;
        },

        $loadDocument: async function () {
            if (!this.pdfFile) {
                throw new Error('No PDF file provided.');
            }

            const module = await import(URL_OPT_DIR + 'bin/quiqqer-asset/pdfjs-dist/pdfjs-dist/build/pdf.mjs');

            if (this.$destroyed) {
                return;
            }

            module.GlobalWorkerOptions.workerSrc = URL_OPT_DIR + 'bin/quiqqer-asset/pdfjs-dist/pdfjs-dist/build/pdf.worker.min.mjs';
            this.$loadingTask = module.getDocument(this.pdfFile);
            this.$pdf = await this.$loadingTask.promise;

            if (this.$destroyed) {
                return;
            }

            this.maxPage = this.$pdf.numPages;
            const sheetsContainer = this.getElm().querySelector('[data-name="sheets"]');
            const placeholders = Array.from(sheetsContainer.querySelectorAll('[data-name="sheet"]'));
            this.sheets = [];

            placeholders.slice(this.maxPage).forEach(sheet => sheet.remove());

            for (let pageNumber = 1; pageNumber <= this.maxPage; pageNumber++) {
                let sheet = placeholders[pageNumber - 1];

                if (!sheet) {
                    sheet = document.createElement('button');
                    sheet.className = 'sheet';
                    sheet.setAttribute('data-name', 'sheet');
                    sheetsContainer.appendChild(sheet);
                }

                sheet.type = 'button';
                sheet.disabled = false;
                sheet.setAttribute('data-page', pageNumber);
                sheet.setAttribute('aria-label', this.$pageLabel(pageNumber));
                sheet.addEventListener('click', () => this.showPageNumber(pageNumber));
                this.sheets.push(sheet);
            }

            this.enableButtons();
            await this.showPageNumber(1);

            if (this.$destroyed) {
                return;
            }

            // Render visible thumbnails sequentially, after the main page.
            this.$thumbnailObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.$thumbnailObserver.unobserve(entry.target);
                        this.$thumbnailQueue.push(entry.target);
                    }
                });

                this.$renderThumbnails();
            }, {rootMargin: '200px'});

            this.sheets.forEach(sheet => this.$thumbnailObserver.observe(sheet));
        },

        $renderThumbnails: async function () {
            if (this.$renderingThumbnails || this.$destroyed) {
                return;
            }

            this.$renderingThumbnails = true;

            try {
                while (this.$thumbnailQueue.length && !this.$destroyed) {
                    const sheet = this.$thumbnailQueue.shift();

                    if (this.$pagePromise) {
                        await this.$pagePromise;
                    }

                    if (this.$destroyed) {
                        break;
                    }

                    try {
                        const page = await this.$pdf.getPage(Number(sheet.getAttribute('data-page')));

                        if (this.$destroyed) {
                            break;
                        }

                        const canvas = this.$createCanvas(page, 0.2);
                        canvas.setAttribute('aria-hidden', 'true');
                        this.$thumbnailTask = page.render({
                            canvasContext: canvas.getContext('2d'),
                            viewport: page.getViewport({scale: 0.2})
                        });
                        await this.$thumbnailTask.promise;

                        if (!this.$destroyed) {
                            sheet.replaceChildren(canvas);
                        }
                    } catch (error) {
                        if (!this.$destroyed) {
                            // Keep the page button usable even if its thumbnail fails.
                            sheet.textContent = sheet.getAttribute('data-page');
                            console.error('Unable to render PDF thumbnail:', error);
                        }
                    } finally {
                        this.$thumbnailTask = null;
                    }
                }
            } finally {
                this.$renderingThumbnails = false;
            }
        },

        $createCanvas: function (page, scale) {
            const viewport = page.getViewport({scale});
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            return canvas;
        },

        $pageLabel: function (pageNumber) {
            return QUILocale.get('quiqqer/bricks', 'pdfPreview.page', {
                page: pageNumber,
                total: this.maxPage
            });
        },

        showPageNumber: function (pageNumber) {
            if (this.$destroyed || !this.$pdf || !Number.isInteger(pageNumber)
                || pageNumber < 1 || pageNumber > this.maxPage) {
                return Promise.resolve();
            }

            if (pageNumber === this.$requestedPage && this.$pagePromise) {
                return this.$pagePromise;
            }

            this.$requestedPage = pageNumber;

            if (this.$renderTask) {
                this.$renderTask.cancel();
            }

            if (!this.$pagePromise && pageNumber !== this.currentPage) {
                this.$pagePromise = this.$renderRequestedPage().finally(() => {
                    this.$pagePromise = null;
                });
            }

            return this.$pagePromise || Promise.resolve();
        },

        $renderRequestedPage: async function () {
            const preview = this.getElm().querySelector('[data-name="preview"]');
            this.isLoading = true;
            preview.setAttribute('aria-busy', 'true');
            this.$status.textContent = '';

            try {
                while (!this.$destroyed && this.$requestedPage !== this.currentPage) {
                    const pageNumber = this.$requestedPage;

                    try {
                        await this.$renderPage(pageNumber, preview);
                    } catch (error) {
                        if (this.$destroyed) {
                            break;
                        }

                        if (error.name === 'RenderingCancelledException' || pageNumber !== this.$requestedPage) {
                            continue;
                        }

                        this.$requestedPage = this.currentPage;
                        this.$showError(error);
                        break;
                    }
                }
            } finally {
                this.isLoading = false;

                if (!this.$destroyed) {
                    preview.setAttribute('aria-busy', 'false');
                    this.enableButtons();
                }
            }
        },

        $renderPage: async function (pageNumber, preview) {
            const page = await this.$pdf.getPage(pageNumber);

            if (this.$destroyed || pageNumber !== this.$requestedPage) {
                return;
            }

            const canvas = this.$createCanvas(page, 1.5);
            canvas.setAttribute('data-name', 'page');
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', this.$pageLabel(pageNumber));
            const task = page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: page.getViewport({scale: 1.5})
            });
            this.$renderTask = task;

            try {
                await task.promise;
            } finally {
                if (this.$renderTask === task) {
                    this.$renderTask = null;
                }
            }

            if (this.$destroyed || pageNumber !== this.$requestedPage) {
                return;
            }

            const previous = preview.querySelector('[data-name="page"]');

            if (previous) {
                await this.hidePage(previous);
            }

            if (this.$destroyed || pageNumber !== this.$requestedPage) {
                if (previous && !this.$destroyed) {
                    previous.style.opacity = '1';
                    previous.style.transform = 'scale(1)';
                }
                return;
            }

            if (previous) {
                previous.remove();
            }

            const skeleton = preview.querySelector('[data-name="loader"]');

            if (skeleton) {
                skeleton.remove();
            }

            preview.appendChild(canvas);
            this.currentPage = pageNumber;
            this.setActiveSheet();
            this.enableButtons();
            await this.showPage(canvas);
        },

        $showError: function (error) {
            this.$status.textContent = QUILocale.get('quiqqer/bricks', 'pdfPreview.error');
            console.error('Unable to display PDF:', error);
        },

        handleOpenPageClick: function (direction) {
            return direction === 'next' ? this.openNextPage() : this.openPrevPage();
        },

        openNextPage: function () {
            return this.showPageNumber(Math.min((this.$requestedPage || this.currentPage) + 1, this.maxPage));
        },

        openPrevPage: function () {
            return this.showPageNumber(Math.max((this.$requestedPage || this.currentPage) - 1, 1));
        },

        $onDestroy: function () {
            this.$destroyed = true;
            this.$observer?.disconnect();
            this.$thumbnailObserver?.disconnect();
            this.$renderTask?.cancel();
            this.$thumbnailTask?.cancel();
            this.$thumbnailQueue = [];
            this.$animations.forEach(animation => animation.cancel());
            this.$animations.clear();

            if (this.$loadingTask) {
                this.$loadingTask.destroy().catch(error => console.error('Unable to release PDF:', error));
            }

            this.$pdf = null;
        },

        hidePage: function (page) {
            return this.$animatePage(page, [
                {transform: 'scale(1)', opacity: 1},
                {transform: 'scale(0.95)', opacity: 0}
            ]);
        },

        showPage: function (page) {
            return this.$animatePage(page, [
                {transform: 'scale(1.1)', opacity: 0},
                {transform: 'scale(1)', opacity: 1}
            ]);
        },

        $animatePage: async function (page, frames) {
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                const animation = page.animate(frames, {duration: 300, easing: 'ease-in-out'});
                this.$animations.add(animation);

                try {
                    await animation.finished;
                } catch (error) {
                    if (!this.$destroyed) {
                        throw error;
                    }
                } finally {
                    this.$animations.delete(animation);
                }
            }

            if (!this.$destroyed) {
                Object.assign(page.style, frames[frames.length - 1]);
            }
        },

        setActiveSheet: function() {
            this.sheets.forEach((sheet, index) => {
                if (index === this.currentPage - 1) {
                    sheet.classList.add('active');
                    sheet.setAttribute('aria-current', 'page');
                } else {
                    sheet.classList.remove('active');
                    sheet.removeAttribute('aria-current');
                }
            });
        },

        disableButtons: function() {
            if (this.NextBtn) {
                this.NextBtn.disabled = true;
            }

            if (this.PrevBtn) {
                this.PrevBtn.disabled = true;
            }
        },

        enableButtons: function() {
            if (this.NextBtn) {
                this.NextBtn.disabled = !this.$pdf || this.currentPage === this.maxPage;
            }

            if (this.PrevBtn) {
                this.PrevBtn.disabled = !this.$pdf || this.currentPage <= 1;
            }
        }
    });
});
