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
    const THUMB_WIDTH = 160;

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
            '$onCancel',
            '$onFullscreenChange',
            '$onKeyDown',
            '$onResize',
            '$onBookPointerDown',
            '$onBookPointerUp',
            '$onMutation',
            'close',
            'next',
            'prev',
            'toggleFullscreen'
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
            this.$jumping = false;
            this.$thumbFirst = new Set();
            this.$thumbnails = new Map();
            this.$thumbnailPromises = new Map();
            this.$thumbnailTasks = new Set();
            this.$thumbnailQueue = [];
            this.$renderingThumbnails = false;
            this.$gridObserver = null;
            this.$fullscreenExitedAt = 0;

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

            // A jump shows the small thumbnail first, then the sharp page.
            this.$jumping = true;
            this.$pageFlip.turnToPage(target - 1);
            this.$jumping = false;
        },

        /**
         * Opens or closes the browser fullscreen for the viewer.
         */
        toggleFullscreen: function () {
            if (!this.$dialog || !document.fullscreenEnabled) {
                return;
            }

            const frame = this.$dialog.querySelector('[data-name="frame"]');

            if (document.fullscreenElement === frame) {
                document.exitFullscreen().catch(error => console.error(error));
                return;
            }

            frame.requestFullscreen().catch(error => console.error(error));
        },

        $buildDialog: function () {
            const title = this.getAttribute('title')
                || fileNameFromUrl(this.getAttribute('pdf'))
                || QUILocale.get(lg, 'pdfPreview.open');

            const dialog = document.createElement('dialog');
            dialog.className = 'quiqqer-bricks-pdfViewer';
            dialog.setAttribute('data-name', 'pdf-viewer');
            dialog.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.title', {title}));

            // Dialogs cannot go fullscreen themselves, the inner frame does.
            dialog.innerHTML = `
                <div class="quiqqer-bricks-pdfViewer__frame" data-name="frame">
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
                <section class="quiqqer-bricks-pdfViewer__grid" data-name="grid" hidden>
                    <div class="quiqqer-bricks-pdfViewer__gridHead">
                        <p class="quiqqer-bricks-pdfViewer__gridTitle" data-name="gridTitle"></p>
                        <button type="button" class="btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn" data-name="gridClose">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>
                    <ul class="quiqqer-bricks-pdfViewer__gridList" data-name="gridList"></ul>
                </section>
                <footer class="quiqqer-bricks-pdfViewer__bar">
                    <input type="range" class="quiqqer-bricks-pdfViewer__slider" data-name="slider"
                           min="1" max="1" step="1" value="1" disabled>
                    <p class="quiqqer-bricks-pdfViewer__indicator" data-name="indicator" aria-hidden="true"></p>
                    <div class="quiqqer-bricks-pdfViewer__tools" data-name="tools">
                        <button type="button" class="btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn" data-name="gridToggle"
                                aria-expanded="false" disabled>
                            <i class="fa-solid fa-table-cells-large" aria-hidden="true"></i>
                        </button>
                    </div>
                </footer>
                <p class="quiqqer-bricks-pdfViewer__status" data-name="status" role="status"></p>
                </div>
            `;

            dialog.querySelector('[data-name="title"]').textContent = title;
            dialog.querySelector('[data-name="close"]').setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.close'));
            dialog.querySelector('[data-name="prev"]').setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.previous'));
            dialog.querySelector('[data-name="next"]').setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.next'));
            dialog.querySelector('[data-name="message"]').setAttribute(
                'aria-label',
                QUILocale.get(lg, 'pdfPreview.brick.frontend.loading.title')
            );

            const grid = dialog.querySelector('[data-name="grid"]');
            const gridToggle = dialog.querySelector('[data-name="gridToggle"]');
            const slider = dialog.querySelector('[data-name="slider"]');

            grid.id = 'quiqqer-bricks-pdfViewer-grid-' + this.getId();
            grid.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.grid'));
            dialog.querySelector('[data-name="gridTitle"]').textContent = QUILocale.get(lg, 'pdfPreview.viewer.grid');
            dialog.querySelector('[data-name="gridClose"]').setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.gridClose'));
            gridToggle.setAttribute('aria-controls', grid.id);
            gridToggle.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.grid'));
            slider.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.slider'));

            this.$buildTools(dialog.querySelector('[data-name="tools"]'));

            dialog.querySelector('[data-name="close"]').addEventListener('click', this.close);
            dialog.querySelector('[data-name="prev"]').addEventListener('click', this.prev);
            dialog.querySelector('[data-name="next"]').addEventListener('click', this.next);
            dialog.querySelector('[data-name="gridClose"]').addEventListener('click', () => this.$closeGrid());
            gridToggle.addEventListener('click', () => {
                if (grid.hidden) {
                    this.$openGrid();
                } else {
                    this.$closeGrid();
                }
            });

            // input: preview the target page, change: jump there.
            slider.addEventListener('input', () => this.$previewSlider());
            slider.addEventListener('change', () => this.goToPage(Number(slider.value)));

            dialog.addEventListener('close', this.$onDialogClose);
            dialog.addEventListener('cancel', this.$onCancel);
            dialog.addEventListener('keydown', this.$onKeyDown);

            this.$dialog = dialog;
            this.$Elm = dialog;
            this.$book = dialog.querySelector('[data-name="book"]');
            this.$bookHolder = dialog.querySelector('[data-name="bookHolder"]');
            this.$status = dialog.querySelector('[data-name="status"]');
        },

        /**
         * Download and fullscreen buttons, only when available.
         */
        $buildTools: function (tools) {
            const pdfUrl = this.getAttribute('pdf');

            if (this.getAttribute('download') && pdfUrl) {
                const download = document.createElement('a');
                download.className = 'btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn';
                download.setAttribute('data-name', 'download');
                download.setAttribute('href', pdfUrl);
                download.setAttribute('download', '');
                download.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.download'));
                download.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i>';
                tools.appendChild(download);
            }

            if (document.fullscreenEnabled) {
                const fullscreen = document.createElement('button');
                fullscreen.type = 'button';
                fullscreen.className = 'btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn';
                fullscreen.setAttribute('data-name', 'fullscreen');
                fullscreen.setAttribute('aria-pressed', 'false');
                fullscreen.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.viewer.fullscreen'));
                fullscreen.setAttribute('title', QUILocale.get(lg, 'pdfPreview.viewer.fullscreen'));
                fullscreen.innerHTML = '<i class="fa-solid fa-expand" aria-hidden="true"></i>';
                fullscreen.addEventListener('click', this.toggleFullscreen);
                tools.appendChild(fullscreen);

                document.addEventListener('fullscreenchange', this.$onFullscreenChange);
            }
        },

        $onFullscreenChange: function () {
            const button = this.$dialog?.querySelector('[data-name="fullscreen"]');

            if (!button) {
                return;
            }

            const active = document.fullscreenElement === this.$dialog.querySelector('[data-name="frame"]');
            const label = QUILocale.get(lg, active ? 'pdfPreview.viewer.fullscreenExit' : 'pdfPreview.viewer.fullscreen');

            if (!active) {
                this.$fullscreenExitedAt = performance.now();
            }

            // The accessible name stays, aria-pressed carries the state.
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
            button.setAttribute('title', label);
            button.querySelector('i').className = 'fa-solid ' + (active ? 'fa-compress' : 'fa-expand');

            this.$onResize();
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

                const slider = this.$dialog.querySelector('[data-name="slider"]');
                slider.max = this.$numPages;
                slider.disabled = this.$numPages < 2;
                this.$dialog.querySelector('[data-name="gridToggle"]').disabled = false;

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
            const landscape = this.$dialog.querySelector('[data-name="frame"]').clientWidth >= LANDSCAPE_MIN_WIDTH;
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

            this.$updateSlider(first, text);
            this.$updateGridCurrent(pages);

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

            if (this.$isGridOpen()) {
                if (event.key === 'Escape') {
                    // Close only the overview; also stops the dialog cancel.
                    event.preventDefault();
                    this.$closeGrid();
                }

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

            target.forEach(page => this.$applyPageThumbnail(page));

            this.$thumbFirst = new Set();

            if (this.$jumping) {
                this.$visiblePages().forEach((page) => {
                    if (!this.$rendered.has(page) && !this.$thumbnails.has(page)) {
                        this.$thumbFirst.add(page);
                    }
                });
            }

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

            if (this.$thumbFirst.delete(pageNumber)) {
                try {
                    await this.$getThumbnail(pageNumber);
                    this.$applyPageThumbnail(pageNumber);
                } catch (error) {
                    // The sharp render below still shows the page.
                }
            }

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
                element.querySelector('[data-name="thumb"]')?.remove();
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

            this.$applyPageThumbnail(pageNumber);
        },

        /**
         * Blurred preview: shows the cached thumbnail until the sharp canvas exists.
         */
        $applyPageThumbnail: function (pageNumber) {
            const url = this.$thumbnails.get(pageNumber);

            if (!url || this.$rendered.has(pageNumber)) {
                return;
            }

            this.$book.querySelectorAll('[data-page="' + pageNumber + '"]').forEach((element) => {
                if (element.querySelector('[data-name="thumb"]')) {
                    return;
                }

                const image = document.createElement('img');
                image.className = 'quiqqer-bricks-pdfViewer__pageThumb';
                image.setAttribute('data-name', 'thumb');
                image.setAttribute('alt', '');
                image.src = url;

                element.querySelector('[data-name="loader"]')?.remove();
                element.prepend(image);
            });
        },

        /**
         * Renders a small JPEG of a page once and caches its object URL.
         *
         * @return {Promise<String>}
         */
        $getThumbnail: function (pageNumber) {
            if (this.$thumbnails.has(pageNumber)) {
                return Promise.resolve(this.$thumbnails.get(pageNumber));
            }

            if (this.$thumbnailPromises.has(pageNumber)) {
                return this.$thumbnailPromises.get(pageNumber);
            }

            const promise = (async () => {
                const page = await this.$pdf.getPage(pageNumber);

                if (this.$destroyed) {
                    return '';
                }

                const viewport = page.getViewport({scale: 1});
                const scale = THUMB_WIDTH * PdfRenderer.outputScale() / viewport.width;
                const canvas = PdfRenderer.createCanvas(page, scale);
                const task = PdfRenderer.render(page, canvas, scale);

                this.$thumbnailTasks.add(task);

                try {
                    await task.promise;
                } finally {
                    this.$thumbnailTasks.delete(task);
                }

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

                canvas.width = 0;
                canvas.height = 0;

                if (this.$destroyed || !blob) {
                    return '';
                }

                const url = URL.createObjectURL(blob);
                this.$thumbnails.set(pageNumber, url);

                return url;
            })().finally(() => {
                this.$thumbnailPromises.delete(pageNumber);
            });

            this.$thumbnailPromises.set(pageNumber, promise);

            return promise;
        },

        $updateSlider: function (page, text) {
            const slider = this.$dialog.querySelector('[data-name="slider"]');

            slider.value = page;
            slider.setAttribute('aria-valuetext', text);
            this.$setSliderProgress(slider);
        },

        $setSliderProgress: function (slider) {
            const max = Number(slider.max) || 1;
            const progress = max > 1 ? (Number(slider.value) - 1) / (max - 1) * 100 : 0;

            slider.style.setProperty('--_progress', progress + '%');
        },

        /**
         * While dragging the slider only the indicator changes.
         */
        $previewSlider: function () {
            const slider = this.$dialog.querySelector('[data-name="slider"]');
            const text = QUILocale.get(lg, 'pdfPreview.page', {
                page: Number(slider.value),
                total: this.$numPages
            });

            this.$dialog.querySelector('[data-name="indicator"]').textContent = text;
            slider.setAttribute('aria-valuetext', text);
            this.$setSliderProgress(slider);
        },

        $isGridOpen: function () {
            return !!this.$dialog && !this.$dialog.querySelector('[data-name="grid"]').hidden;
        },

        $openGrid: function () {
            if (!this.$pageFlipLoaded) {
                return;
            }

            const grid = this.$dialog.querySelector('[data-name="grid"]');

            if (!this.$gridObserver) {
                this.$buildGrid();
            }

            grid.hidden = false;
            this.$dialog.querySelector('[data-name="gridToggle"]').setAttribute('aria-expanded', 'true');
            this.$updateGridCurrent(this.$visiblePages());

            const current = grid.querySelector('[aria-current="page"]');

            if (current) {
                current.scrollIntoView({block: 'center'});
                current.focus();
            }
        },

        $closeGrid: function () {
            const grid = this.$dialog.querySelector('[data-name="grid"]');
            const toggle = this.$dialog.querySelector('[data-name="gridToggle"]');

            grid.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            this.$thumbnailQueue = [];
            toggle.focus();
        },

        $buildGrid: function () {
            const list = this.$dialog.querySelector('[data-name="gridList"]');
            const fragment = document.createDocumentFragment();
            const ratio = this.$pageWidth + ' / ' + this.$pageHeight;

            for (let page = 1; page <= this.$numPages; page++) {
                const item = document.createElement('li');
                const button = document.createElement('button');
                const thumb = document.createElement('span');
                const label = document.createElement('span');

                button.type = 'button';
                button.className = 'quiqqer-bricks-pdfViewer__gridPage';
                button.setAttribute('data-name', 'gridPage');
                button.setAttribute('data-page', page);
                button.setAttribute('aria-label', QUILocale.get(lg, 'pdfPreview.page', {
                    page: page,
                    total: this.$numPages
                }));

                thumb.className = 'quiqqer-bricks-pdfViewer__gridThumb';
                thumb.setAttribute('data-name', 'gridThumb');
                thumb.style.aspectRatio = ratio;
                thumb.appendChild(this.$createLoader());

                label.className = 'quiqqer-bricks-pdfViewer__gridLabel';
                label.setAttribute('aria-hidden', 'true');
                label.textContent = page;

                button.appendChild(thumb);
                button.appendChild(label);
                button.addEventListener('click', () => {
                    this.$closeGrid();
                    this.goToPage(page);
                });

                item.appendChild(button);
                fragment.appendChild(item);

                if (this.$thumbnails.has(page)) {
                    this.$applyGridThumbnail(page, button);
                }
            }

            list.appendChild(fragment);

            this.$gridObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    const page = Number(entry.target.getAttribute('data-page'));
                    this.$gridObserver.unobserve(entry.target);

                    if (this.$thumbnails.has(page)) {
                        this.$applyGridThumbnail(page, entry.target);
                    } else {
                        this.$thumbnailQueue.push(page);
                    }
                });

                this.$renderThumbnails();
            }, {
                root: this.$dialog.querySelector('[data-name="grid"]'),
                rootMargin: '200px'
            });

            list.querySelectorAll('[data-name="gridPage"]').forEach((button) => {
                if (!this.$thumbnails.has(Number(button.getAttribute('data-page')))) {
                    this.$gridObserver.observe(button);
                }
            });
        },

        $renderThumbnails: async function () {
            if (this.$renderingThumbnails) {
                return;
            }

            this.$renderingThumbnails = true;

            try {
                while (this.$thumbnailQueue.length && !this.$destroyed) {
                    const page = this.$thumbnailQueue.shift();

                    try {
                        await this.$getThumbnail(page);
                    } catch (error) {
                        if (!this.$destroyed && error?.name !== 'RenderingCancelledException') {
                            console.error('Unable to render PDF thumbnail:', error);
                        }

                        continue;
                    }

                    if (this.$destroyed) {
                        break;
                    }

                    this.$applyGridThumbnail(page);
                    this.$applyPageThumbnail(page);
                }
            } finally {
                this.$renderingThumbnails = false;
            }
        },

        $applyGridThumbnail: function (pageNumber, button) {
            const url = this.$thumbnails.get(pageNumber);
            const target = button || this.$dialog.querySelector('[data-name="gridPage"][data-page="' + pageNumber + '"]');
            const thumb = target?.querySelector('[data-name="gridThumb"]');

            if (!url || !thumb || thumb.querySelector('img')) {
                return;
            }

            const image = document.createElement('img');
            image.setAttribute('alt', '');
            image.src = url;

            thumb.replaceChildren(image);
        },

        $updateGridCurrent: function (pages) {
            if (!this.$gridObserver) {
                return;
            }

            this.$dialog.querySelectorAll('[data-name="gridPage"]').forEach((button) => {
                if (pages.includes(Number(button.getAttribute('data-page')))) {
                    button.setAttribute('aria-current', 'page');
                } else {
                    button.removeAttribute('aria-current');
                }
            });
        },

        /**
         * ESC leaves fullscreen first, then closes the overview, then the viewer.
         */
        $onCancel: function (event) {
            // ESC in fullscreen only leaves fullscreen. The browser may fire
            // cancel before or right after fullscreenchange.
            const inFullscreen = document.fullscreenElement && this.$dialog.contains(document.fullscreenElement);

            if (inFullscreen || performance.now() - this.$fullscreenExitedAt < 500) {
                event.preventDefault();

                if (inFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }

                return;
            }

            if (this.$isGridOpen()) {
                event.preventDefault();
                this.$closeGrid();
            }
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
            document.removeEventListener('fullscreenchange', this.$onFullscreenChange);

            if (document.fullscreenElement && this.$dialog.contains(document.fullscreenElement)) {
                document.exitFullscreen().catch(() => {});
            }

            if (this.$resizeFrame) {
                cancelAnimationFrame(this.$resizeFrame);
            }

            clearTimeout(this.$resizeTimer);
            clearTimeout(this.$tapTimer);

            this.$observer?.disconnect();
            this.$gridObserver?.disconnect();
            this.$renderQueue = [];
            this.$thumbnailQueue = [];
            this.$renderTask?.cancel();
            this.$thumbnailTasks.forEach(task => task.cancel());
            this.$thumbnails.forEach(url => URL.revokeObjectURL(url));
            this.$thumbnails.clear();

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
