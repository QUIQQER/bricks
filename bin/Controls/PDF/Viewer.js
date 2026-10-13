/**
 * Fullscreen PDF flipbook viewer.
 *
 * Opens a native <dialog>, renders the PDF with pdf.js (shared through
 * PdfRenderer) and flips the pages with StPageFlip. Only the visible pages
 * and their neighbours keep a canvas, so large PDFs stay light.
 *
 * @module package/quiqqer/bricks/bin/Controls/PDF/Viewer
 *
 * @example
 * require(['package/quiqqer/bricks/bin/Controls/PDF/Viewer'], (Viewer) => {
 *     new Viewer({pdf: url, page: 1, id: '', title: '', download: false}).open();
 * });
 */
define('package/quiqqer/bricks/bin/Controls/PDF/Viewer', [

    'qui/QUI',
    'qui/controls/Control',
    'Locale',
    'package/quiqqer/bricks/bin/Controls/PDF/PdfRenderer',

    'css!package/quiqqer/bricks/bin/Controls/PDF/Viewer.css'

], function (QUI, QUIControl, QUILocale, PdfRenderer) {
    "use strict";

    const lg = 'quiqqer/bricks';

    // The only place that knows the flipbook library path.
    const PAGE_FLIP_URL = URL_OPT_DIR + 'bin/page-flip/dist/js/page-flip.browser.js';

    const LANDSCAPE_MIN_WIDTH = 768;
    const RENDER_RANGE = 2;
    const RERENDER_THRESHOLD = 0.15;
    const MAX_CANVAS_PIXELS = 16000000;
    const TAP_DELAY = 250;
    const TAP_DISTANCE = 10;

    let pageFlipPromise = null;

    function loadPageFlip() {
        if (!pageFlipPromise) {
            pageFlipPromise = new Promise((resolve, reject) => {
                require([PAGE_FLIP_URL], (module) => {
                    resolve(module && module.PageFlip ? module : window.St);
                }, (error) => {
                    pageFlipPromise = null;
                    reject(error);
                });
            });
        }

        return pageFlipPromise;
    }

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function fileNameFromUrl(url) {
        try {
            const pathname = new URL(url, window.location.href).pathname;
            const name = decodeURIComponent(pathname.split('/').pop() || '');

            return /\.pdf$/i.test(name) ? name : '';
        } catch (error) {
            return '';
        }
    }

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/PDF/Viewer',

        Binds: [
            '$onDialogClose',
            '$onKeyDown',
            '$onResize',
            '$onBookPointerDown',
            '$onBookPointerUp',
            '$onMutation',
            'close',
            'next',
            'prev'
        ],

        options: {
            pdf: '',
            page: 1,
            id: '',
            title: '',
            download: false
        },

        initialize: function (options) {
            this.parent(options);

            this.$dialog = null;
            this.$book = null;
            this.$bookHolder = null;
            this.$status = null;
            this.$pageElements = [];
            this.$pageFlip = null;
            this.$pageFlipLoaded = false;
            this.$pdf = null;
            this.$acquiredFile = '';
            this.$numPages = 0;
            this.$pageWidth = 0;
            this.$pageHeight = 0;
            this.$minWidth = 160;
            this.$currentPage = 0;
            this.$rendered = new Map();
            this.$targetPages = new Set();
            this.$renderQueue = [];
            this.$renderTask = null;
            this.$renderTaskPage = 0;
            this.$rendering = false;
            this.$observer = null;
            this.$trigger = null;
            this.$scrollOverflow = '';
            this.$resizeFrame = null;
            this.$resizeTimer = null;
            this.$tapTimer = null;
            this.$pointerStart = null;
            this.$dragged = false;
            this.$destroyed = false;

            this.addEvents({
                onDestroy: () => this.$teardown()
            });
        },

        /**
         * Opens the viewer as a modal dialog.
         *
         * @return {self}
         */
        open: function () {
            if (this.$dialog) {
                return this;
            }

            this.$trigger = document.activeElement;
            this.$buildDialog();

            document.body.appendChild(this.$dialog);

            this.$scrollOverflow = document.documentElement.style.overflow;
            document.documentElement.style.overflow = 'hidden';

            this.$dialog.showModal();
            window.addEventListener('resize', this.$onResize);

            this.fireEvent('open', [this]);

            this.$load().catch((error) => {
                if (!this.$destroyed) {
                    this.$showError(error);
                }
            });

            return this;
        },

        /**
         * Closes the viewer and releases all resources.
         */
        close: function () {
            if (this.$dialog && this.$dialog.open) {
                // The close event of the dialog runs the teardown.
                this.$dialog.close();
                return;
            }

            this.$teardown();
        },

        /**
         * Current (first visible) page, 1-based.
         *
         * @return {Number}
         */
        getPage: function () {
            return this.$visiblePages()[0] || 1;
        },

        next: function () {
            if (!this.$pageFlipLoaded) {
                return;
            }

            if (prefersReducedMotion()) {
                this.$pageFlip.turnToNextPage();
                return;
            }

            this.$pageFlip.flipNext();
        },

        prev: function () {
            if (!this.$pageFlipLoaded) {
                return;
            }

            if (prefersReducedMotion()) {
                this.$pageFlip.turnToPrevPage();
                return;
            }

            this.$pageFlip.flipPrev();
        },

        /**
         * Jumps to a page without animation.
         *
         * @param {Number} page - 1-based page number
         */
        goToPage: function (page) {
            if (!this.$pageFlipLoaded) {
                return;
            }

            const target = Math.min(Math.max(1, Math.round(page) || 1), this.$numPages);
            this.$pageFlip.turnToPage(target - 1);
        },

        $buildDialog: function () {
            const title = this.getAttribute('title')
                || fileNameFromUrl(this.getAttribute('pdf'))
                || QUILocale.get(lg, 'pdfPreview.open');

            const dialog = document.createElement('dialog');
            dialog.className = 'quiqqer-bricks-pdfViewer';
            dialog.setAttribute('data-name', 'pdf-viewer');
            dialog.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.title', {title}));

            dialog.innerHTML = `
                <header class="quiqqer-bricks-pdfViewer__top">
                    <p class="quiqqer-bricks-pdfViewer__title" data-name="title"></p>
                    <button type="button" class="btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn" data-name="close">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </header>
                <div class="quiqqer-bricks-pdfViewer__stage" data-name="stage">
                    <button type="button" class="btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn" data-name="prev" disabled>
                        <i class="fa-solid fa-angle-left" aria-hidden="true"></i>
                    </button>
                    <div class="quiqqer-bricks-pdfViewer__bookArea" data-name="bookArea">
                        <div class="quiqqer-bricks-pdfViewer__bookHolder" data-name="bookHolder">
                            <div class="quiqqer-bricks-pdfViewer__book" data-name="book"></div>
                        </div>
                        <p class="quiqqer-bricks-pdfViewer__message" data-name="message">
                            <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                        </p>
                    </div>
                    <button type="button" class="btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn" data-name="next" disabled>
                        <i class="fa-solid fa-angle-right" aria-hidden="true"></i>
                    </button>
                </div>
                <footer class="quiqqer-bricks-pdfViewer__bar">
                    <p class="quiqqer-bricks-pdfViewer__indicator" data-name="indicator" aria-hidden="true"></p>
                    <div class="quiqqer-bricks-pdfViewer__tools" data-name="tools"></div>
                </footer>
                <p class="quiqqer-bricks-pdfViewer__status" data-name="status" role="status"></p>
            `;

            dialog.querySelector('[data-name="title"]').textContent = title;
            dialog.querySelector('[data-name="close"]').setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.close'));
            dialog.querySelector('[data-name="prev"]').setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.previous'));
            dialog.querySelector('[data-name="next"]').setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.next'));
            dialog.querySelector('[data-name="message"]').setAttribute(
                'aria-label',
                QUILocale.get(lg, 'pdfPreview.brick.frontend.loading.title')
            );

            dialog.querySelector('[data-name="close"]').addEventListener('click', this.close);
            dialog.querySelector('[data-name="prev"]').addEventListener('click', this.prev);
            dialog.querySelector('[data-name="next"]').addEventListener('click', this.next);
            dialog.addEventListener('close', this.$onDialogClose);
            dialog.addEventListener('keydown', this.$onKeyDown);

            this.$dialog = dialog;
            this.$Elm = dialog;
            this.$book = dialog.querySelector('[data-name="book"]');
            this.$bookHolder = dialog.querySelector('[data-name="bookHolder"]');
            this.$status = dialog.querySelector('[data-name="status"]');
        },

        $load: async function () {
            const pdfUrl = this.getAttribute('pdf');

            if (!pdfUrl) {
                throw new Error('No PDF file provided.');
            }

            this.$acquiredFile = pdfUrl;

            const [PageFlipLibrary, pdf] = await Promise.all([
                loadPageFlip(),
                PdfRenderer.acquire(pdfUrl)
            ]);

            if (this.$destroyed) {
                return;
            }

            if (!PageFlipLibrary || !PageFlipLibrary.PageFlip) {
                throw new Error('StPageFlip could not be loaded.');
            }

            this.$pdf = pdf;
            this.$numPages = pdf.numPages;

            const firstPage = await pdf.getPage(1);

            if (this.$destroyed) {
                return;
            }

            const viewport = firstPage.getViewport({scale: 1});
            this.$pageWidth = viewport.width;
            this.$pageHeight = viewport.height;

            this.$buildPages();
            this.$initPageFlip(PageFlipLibrary);
        },

        $buildPages: function () {
            const fragment = document.createDocumentFragment();

            for (let page = 1; page <= this.$numPages; page++) {
                const element = document.createElement('div');
                element.className = 'quiqqer-bricks-pdfViewer__page';
                element.setAttribute('data-name', 'page');
                element.setAttribute('data-page', page);
                element.appendChild(this.$createLoader());

                this.$pageElements.push(element);
                fragment.appendChild(element);
            }

            this.$book.appendChild(fragment);
        },

        $createLoader: function () {
            const loader = document.createElement('span');
            loader.className = 'skeleton-loader';
            loader.setAttribute('data-name', 'loader');
            loader.setAttribute('aria-hidden', 'true');

            return loader;
        },

        $initPageFlip: function (PageFlipLibrary) {
            const width = this.$pageWidth;
            const height = this.$pageHeight;
            const requestedPage = parseInt(this.getAttribute('page'), 10) || 1;
            const startPage = Math.min(Math.max(1, requestedPage), this.$numPages);

            this.$fitBook();

            this.$pageFlip = new PageFlipLibrary.PageFlip(this.$book, {
                width: width,
                height: height,
                size: 'stretch',
                minWidth: this.$minWidth,
                maxWidth: width * 3,
                minHeight: 160 * height / width,
                maxHeight: height * 3,
                showCover: true,
                usePortrait: true,
                autoSize: true,
                drawShadow: true,
                maxShadowOpacity: 0.4,
                flippingTime: 450,
                mobileScrollSupport: false,
                disableFlipByClick: true,
                clickEventForward: true,
                startPage: startPage - 1
            });

            this.$pageFlip.on('init', () => {
                if (this.$destroyed) {
                    return;
                }

                this.$dialog.querySelector('[data-name="message"]').hidden = true;
                this.$fitBook();
                this.$onPageChange();
            });

            this.$pageFlip.on('flip', () => this.$onPageChange());
            this.$pageFlip.on('changeOrientation', () => this.$onPageChange());
            this.$pageFlip.on('changeState', (event) => {
                if (event.data === 'user_fold' || event.data === 'flipping') {
                    this.$dragged = true;
                }
            });

            this.$allowFlipByCorner();
            this.$pageFlip.loadFromHTML(this.$pageElements);
            this.$pageFlipLoaded = true;

            // StPageFlip sets fixed minimum sizes, the dialog layout decides instead.
            this.$book.style.minWidth = '0';
            this.$book.style.minHeight = '0';

            // StPageFlip clones pages while flipping; cloned canvases are empty.
            this.$observer = new MutationObserver(this.$onMutation);
            this.$observer.observe(this.$book, {childList: true, subtree: true});

            this.$book.addEventListener('pointerdown', this.$onBookPointerDown);
            this.$book.addEventListener('pointerup', this.$onBookPointerUp);
        },

        /**
         * flipNext()/flipPrev() start the flip from a fixed point. In portrait
         * the point for flipPrev() is not on a page corner, so StPageFlip drops
         * it while disableFlipByClick is set (back button and swipe back did
         * nothing). Allow click flips only for the duration of these calls;
         * the swipe gesture calls the same instance methods.
         */
        $allowFlipByCorner: function () {
            const pageFlip = this.$pageFlip;
            const settings = pageFlip.getSettings();

            ['flipNext', 'flipPrev'].forEach((method) => {
                const original = pageFlip[method].bind(pageFlip);

                pageFlip[method] = (corner) => {
                    settings.disableFlipByClick = false;

                    try {
                        original(corner);
                    } finally {
                        settings.disableFlipByClick = true;
                    }
                };
            });
        },

        /**
         * Sizes the book to the free stage area and picks the orientation.
         */
        $fitBook: function () {
            if (!this.$dialog || !this.$pageWidth) {
                return;
            }

            const area = this.$dialog.querySelector('[data-name="bookArea"]');
            const landscape = this.$dialog.clientWidth >= LANDSCAPE_MIN_WIDTH;
            const ratio = (landscape ? 2 : 1) * this.$pageWidth / this.$pageHeight;
            const bookWidth = Math.max(1, Math.floor(Math.min(area.clientWidth, area.clientHeight * ratio)));

            this.$bookHolder.style.width = bookWidth + 'px';

            // StPageFlip switches to portrait when the book is narrower than 2 * minWidth.
            this.$minWidth = landscape ? Math.min(160, bookWidth / 2) : bookWidth;

            if (this.$pageFlipLoaded) {
                this.$pageFlip.getSettings().minWidth = this.$minWidth;
                this.$pageFlip.update();
            }
        },

        $onResize: function () {
            if (this.$resizeFrame) {
                cancelAnimationFrame(this.$resizeFrame);
            }

            clearTimeout(this.$resizeTimer);

            this.$resizeFrame = requestAnimationFrame(() => {
                this.$resizeFrame = null;
                this.$resizeTimer = setTimeout(() => {
                    if (this.$destroyed) {
                        return;
                    }

                    this.$fitBook();
                    this.$scheduleRender();
                }, 150);
            });
        },

        $isLandscape: function () {
            return this.$pageFlipLoaded && this.$pageFlip.getOrientation() === 'landscape';
        },

        /**
         * @return {Number[]} visible pages, 1-based
         */
        $visiblePages: function () {
            if (!this.$pageFlipLoaded) {
                return [];
            }

            const index = this.$pageFlip.getCurrentPageIndex();

            if (!this.$isLandscape()) {
                return [index + 1];
            }

            if (index === 0) {
                return [1];
            }

            const start = index % 2 === 1 ? index : index - 1;

            return [start + 1, start + 2].filter(page => page <= this.$numPages);
        },

        $onPageChange: function () {
            const pages = this.$visiblePages();

            if (!pages.length) {
                return;
            }

            const first = pages[0];
            const last = pages[pages.length - 1];
            const text = pages.length > 1
                ? QUILocale.get(lg, 'pdfPreview.viewer.pages', {from: first, to: last, total: this.$numPages})
                : QUILocale.get(lg, 'pdfPreview.page', {page: first, total: this.$numPages});

            const indicator = this.$dialog.querySelector('[data-name="indicator"]');

            if (indicator.textContent !== text) {
                indicator.textContent = text;
                this.$status.textContent = text;
            }

            this.$dialog.querySelector('[data-name="prev"]').disabled = first <= 1;
            this.$dialog.querySelector('[data-name="next"]').disabled = last >= this.$numPages;

            if (this.$currentPage !== first) {
                this.$currentPage = first;
                this.fireEvent('pageChange', [this, first]);
            }

            this.$scheduleRender();
        },

        $onKeyDown: function (event) {
            if (!this.$pageFlipLoaded || event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }

            if (event.target.matches('input, select, textarea')) {
                return;
            }

            switch (event.key) {
                case 'ArrowLeft':
                case 'PageUp':
                    this.prev();
                    break;

                case 'ArrowRight':
                case 'PageDown':
                    this.next();
                    break;

                case 'Home':
                    this.goToPage(1);
                    break;

                case 'End':
                    this.goToPage(this.$numPages);
                    break;

                default:
                    return;
            }

            event.preventDefault();
        },

        $onBookPointerDown: function (event) {
            if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
                this.$pointerStart = null;
                return;
            }

            this.$dragged = false;
            this.$pointerStart = {
                x: event.clientX,
                y: event.clientY
            };
        },

        /**
         * A tap or click turns the page: left half back, right half forward.
         * Pointer events are used because StPageFlip cancels touchstart, so
         * taps never produce a click. A second tap within TAP_DELAY cancels
         * the turn (reserved for double click zoom).
         */
        $onBookPointerUp: function (event) {
            const start = this.$pointerStart;
            this.$pointerStart = null;

            if (!start || !event.isPrimary || this.$dragged) {
                return;
            }

            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_DISTANCE) {
                return;
            }

            if (this.$tapTimer) {
                clearTimeout(this.$tapTimer);
                this.$tapTimer = null;
                return;
            }

            const rect = this.$book.getBoundingClientRect();
            const forward = event.clientX >= rect.left + rect.width / 2;

            this.$tapTimer = setTimeout(() => {
                this.$tapTimer = null;

                if (this.$destroyed) {
                    return;
                }

                if (forward) {
                    this.next();
                } else {
                    this.prev();
                }
            }, TAP_DELAY);
        },

        /**
         * @return {Number[]} pages that should keep a canvas, in render order
         */
        $collectTargetPages: function () {
            const visible = this.$visiblePages();

            if (!visible.length) {
                return [];
            }

            const first = visible[0];
            const last = visible[visible.length - 1];
            const pages = visible.slice();

            for (let page = last + 1; page <= Math.min(this.$numPages, last + RENDER_RANGE); page++) {
                pages.push(page);
            }

            for (let page = first - 1; page >= Math.max(1, first - RENDER_RANGE); page--) {
                pages.push(page);
            }

            return pages;
        },

        $scheduleRender: function () {
            if (this.$destroyed || !this.$pdf || !this.$pageFlipLoaded) {
                return;
            }

            const target = this.$collectTargetPages();
            this.$targetPages = new Set(target);

            if (this.$renderTask && !this.$targetPages.has(this.$renderTaskPage)) {
                this.$renderTask.cancel();
            }

            Array.from(this.$rendered.keys()).forEach((page) => {
                if (!this.$targetPages.has(page)) {
                    this.$releasePage(page);
                }
            });

            this.$renderQueue = target.filter(page => this.$needsRender(page));
            this.$processQueue();
        },

        $needsRender: function (page) {
            const entry = this.$rendered.get(page);

            if (!entry) {
                return true;
            }

            const scale = this.$scaleFor(entry.width, entry.height);

            return Math.abs(scale - entry.scale) / entry.scale > RERENDER_THRESHOLD;
        },

        /**
         * Canvas scale for a page so it fits the current page box sharply.
         */
        $scaleFor: function (width, height) {
            const rect = this.$pageFlip.getBoundsRect();
            let scale = Math.min(rect.pageWidth / width, rect.height / height) * PdfRenderer.outputScale();

            // Large canvases crash mobile Safari, keep below its pixel limit.
            if (width * height * scale * scale > MAX_CANVAS_PIXELS) {
                scale = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
            }

            return scale;
        },

        $processQueue: async function () {
            if (this.$rendering) {
                return;
            }

            this.$rendering = true;

            try {
                while (this.$renderQueue.length && !this.$destroyed) {
                    await this.$renderPage(this.$renderQueue.shift());
                }
            } finally {
                this.$rendering = false;
            }
        },

        $renderPage: async function (pageNumber) {
            let canvas = null;

            try {
                const page = await this.$pdf.getPage(pageNumber);

                if (this.$destroyed || !this.$targetPages.has(pageNumber)) {
                    return;
                }

                const viewport = page.getViewport({scale: 1});
                const scale = this.$scaleFor(viewport.width, viewport.height);

                canvas = PdfRenderer.createCanvas(page, scale);
                canvas.setAttribute('data-name', 'canvas');
                canvas.setAttribute('aria-hidden', 'true');

                const task = PdfRenderer.render(page, canvas, scale);
                this.$renderTask = task;
                this.$renderTaskPage = pageNumber;

                try {
                    await task.promise;
                } finally {
                    if (this.$renderTask === task) {
                        this.$renderTask = null;
                        this.$renderTaskPage = 0;
                    }
                }

                if (this.$destroyed || !this.$targetPages.has(pageNumber)) {
                    canvas.width = 0;
                    canvas.height = 0;
                    return;
                }

                const previous = this.$rendered.get(pageNumber);

                this.$rendered.set(pageNumber, {
                    canvas: canvas,
                    scale: scale,
                    width: viewport.width,
                    height: viewport.height
                });

                this.$applyCanvas(pageNumber);

                if (previous) {
                    previous.canvas.width = 0;
                    previous.canvas.height = 0;
                }
            } catch (error) {
                if (canvas) {
                    canvas.width = 0;
                    canvas.height = 0;
                }

                if (this.$destroyed || error?.name === 'RenderingCancelledException') {
                    return;
                }

                this.$status.textContent = QUILocale.get(lg, 'pdfPreview.error');
                console.error('Unable to render PDF page:', error);
            }
        },

        /**
         * Puts the rendered canvas into the page and copies it into StPageFlip clones.
         */
        $applyCanvas: function (pageNumber) {
            const entry = this.$rendered.get(pageNumber);
            const original = this.$pageElements[pageNumber - 1];

            if (!entry || !original) {
                return;
            }

            this.$book.querySelectorAll('[data-page="' + pageNumber + '"]').forEach((element) => {
                if (element !== original) {
                    this.$fillClone(element, entry.canvas);
                    return;
                }

                element.querySelector('[data-name="loader"]')?.remove();
                element.querySelectorAll('canvas').forEach((canvas) => {
                    if (canvas !== entry.canvas) {
                        canvas.remove();
                    }
                });

                if (entry.canvas.parentNode !== element) {
                    element.appendChild(entry.canvas);
                }
            });
        },

        $fillClone: function (element, source) {
            element.querySelectorAll('canvas').forEach(canvas => canvas.remove());
            element.querySelector('[data-name="loader"]')?.remove();

            const copy = document.createElement('canvas');
            copy.width = source.width;
            copy.height = source.height;
            copy.setAttribute('data-name', 'canvas');
            copy.setAttribute('aria-hidden', 'true');
            copy.getContext('2d').drawImage(source, 0, 0);

            element.appendChild(copy);
        },

        $onMutation: function (records) {
            records.forEach((record) => {
                record.addedNodes.forEach((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE || !node.hasAttribute('data-page')) {
                        return;
                    }

                    const pageNumber = Number(node.getAttribute('data-page'));
                    const entry = this.$rendered.get(pageNumber);

                    if (entry && node !== this.$pageElements[pageNumber - 1]) {
                        this.$fillClone(node, entry.canvas);
                    }
                });
            });
        },

        $releasePage: function (pageNumber) {
            const entry = this.$rendered.get(pageNumber);

            if (!entry) {
                return;
            }

            this.$rendered.delete(pageNumber);

            this.$book.querySelectorAll('[data-page="' + pageNumber + '"]').forEach((element) => {
                element.querySelectorAll('canvas').forEach((canvas) => {
                    canvas.width = 0;
                    canvas.height = 0;
                    canvas.remove();
                });

                if (!element.querySelector('[data-name="loader"]')) {
                    element.appendChild(this.$createLoader());
                }
            });

            entry.canvas.width = 0;
            entry.canvas.height = 0;
        },

        $showError: function (error) {
            const message = this.$dialog.querySelector('[data-name="message"]');

            message.hidden = false;
            message.removeAttribute('aria-label');
            message.textContent = QUILocale.get(lg, 'pdfPreview.error');
            console.error('Unable to display PDF:', error);
        },

        $onDialogClose: function () {
            this.$teardown();
        },

        $teardown: function () {
            if (this.$destroyed || !this.$dialog) {
                return;
            }

            this.$destroyed = true;

            window.removeEventListener('resize', this.$onResize);

            if (this.$resizeFrame) {
                cancelAnimationFrame(this.$resizeFrame);
            }

            clearTimeout(this.$resizeTimer);
            clearTimeout(this.$tapTimer);

            this.$observer?.disconnect();
            this.$renderQueue = [];
            this.$renderTask?.cancel();

            Array.from(this.$rendered.keys()).forEach(page => this.$releasePage(page));

            if (this.$pageFlipLoaded) {
                try {
                    this.$pageFlip.destroy();
                } catch (error) {
                    console.error('Unable to destroy the flipbook:', error);
                }
            }

            if (this.$acquiredFile) {
                PdfRenderer.release(this.$acquiredFile);
                this.$acquiredFile = '';
            }

            this.$pdf = null;
            this.$dialog.remove();
            document.documentElement.style.overflow = this.$scrollOverflow;

            if ((document.activeElement === document.body || !document.activeElement)
                && this.$trigger && this.$trigger.isConnected) {
                this.$trigger.focus();
            }

            this.fireEvent('close', [this]);
        }
    });
});
