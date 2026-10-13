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
 *
 * With an id the viewer keeps the page in the URL hash (#<id>-<page>), the
 * back button closes it and a share button appears. Viewer.matchHash(id)
 * returns the page of such a link for the current URL.
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
    const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];
    const MAX_ZOOM = 4;
    const ZOOM_RENDER_DELAY = 200;
    const WHEEL_STEP_DELAY = 200;
    const DOUBLE_TAP_DELAY = 300;

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

    /**
     * Page of a deep link #<id>-<page> in the current URL, or null. An element
     * with the full hash as id is a normal anchor and wins.
     */
    function matchHash(id) {
        if (!id) {
            return null;
        }

        let hash;

        try {
            hash = decodeURIComponent(window.location.hash.slice(1));
        } catch (error) {
            return null;
        }

        if (!hash || document.getElementById(hash)) {
            return null;
        }

        const match = hash.match(/^(.+)-(\d+)$/);

        return match && match[1] === id ? parseInt(match[2], 10) : null;
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

    const Viewer = new Class({

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
            'toggleFullscreen',
            'zoomIn',
            'zoomOut',
            'resetZoom',
            '$onWheel',
            '$onTouchStart',
            '$onTouchMove',
            '$onTouchEnd',
            '$onZoomPointerDown',
            '$onZoomPointerMove',
            '$onZoomPointerUp',
            '$onPopState',
            'share'
        ],

        options: {
            pdf: '',
            page: 1,
            id: '',
            title: '',
            download: false,
            deepLink: false // opened from a #<id>-<page> link
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
            this.$zoom = 1;
            this.$zoomGeneration = 0;
            this.$zoomTasks = new Set();
            this.$zoomRenderTimer = null;
            this.$zoomPointer = null;
            this.$lastZoomTap = 0;
            this.$lastWheelStep = 0;
            this.$pinch = null;
            this.$title = '';
            this.$hashPage = 1;
            this.$historyPushed = false;
            this.$closedByHistory = false;
            this.$announceTimer = null;

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

            this.$hashPage = Math.max(1, parseInt(this.getAttribute('page'), 10) || 1);
            this.$initHistory();

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

            this.resetZoom();

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

            this.resetZoom();

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

            this.resetZoom();

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

        zoomIn: function () {
            this.$zoomStep(1);
        },

        zoomOut: function () {
            this.$zoomStep(-1);
        },

        resetZoom: function () {
            this.$exitZoom();
        },

        /**
         * Shares a link to the current page (Web Share API, else clipboard).
         */
        share: function () {
            const url = window.location.origin + this.$baseUrl() + this.$hash();

            if (navigator.share) {
                navigator.share({
                    title: this.$title,
                    url: url
                }).catch((error) => {
                    if (error.name !== 'AbortError') {
                        console.error('Unable to share the PDF page:', error);
                    }
                });

                return;
            }

            navigator.clipboard.writeText(url).then(() => {
                this.$announce(QUILocale.get(lg, 'pdfPreview.viewer.shareCopied'));
            }).catch((error) => {
                console.error('Unable to copy the PDF link:', error);
            });
        },

        $baseUrl: function () {
            return window.location.pathname + window.location.search;
        },

        $hash: function () {
            return '#' + encodeURIComponent(this.getAttribute('id')) + '-' + this.$hashPage;
        },

        $isOwnHistoryEntry: function () {
            return !!window.history.state && window.history.state.quiqqerPdfViewer === this.getAttribute('id');
        },

        /**
         * Adds a history entry with the page hash, so the back button closes
         * the viewer. A deep link first drops its hash from the current entry,
         * so back stays on the page.
         */
        $initHistory: function () {
            if (!this.getAttribute('id')) {
                return;
            }

            // Forward navigation onto our own entry: reuse it.
            if (!this.$isOwnHistoryEntry()) {
                if (this.getAttribute('deepLink')) {
                    window.history.replaceState(window.history.state, '', this.$baseUrl());
                }

                window.history.pushState({quiqqerPdfViewer: this.getAttribute('id')}, '', this.$baseUrl() + this.$hash());
            }

            this.$historyPushed = true;
            window.addEventListener('popstate', this.$onPopState);
        },

        $updateHistory: function () {
            if (!this.$historyPushed || !this.$isOwnHistoryEntry() || window.location.hash === this.$hash()) {
                return;
            }

            window.history.replaceState(window.history.state, '', this.$baseUrl() + this.$hash());
        },

        $onPopState: function () {
            if (this.$isOwnHistoryEntry()) {
                return;
            }

            this.$closedByHistory = true;
            this.close();
        },

        $cleanupHistory: function () {
            if (!this.$historyPushed) {
                return;
            }

            window.removeEventListener('popstate', this.$onPopState);

            if (this.$closedByHistory) {
                return;
            }

            if (this.$isOwnHistoryEntry()) {
                window.history.back();
                return;
            }

            if (window.location.hash === this.$hash()) {
                window.history.replaceState(window.history.state, '', this.$baseUrl());
            }
        },

        /**
         * Shows a short message in the indicator and the live region.
         */
        $announce: function (text) {
            const indicator = this.$dialog.querySelector('[data-name="indicator"]');

            clearTimeout(this.$announceTimer);
            indicator.textContent = text;
            this.$status.textContent = text;

            this.$announceTimer = setTimeout(() => {
                if (!this.$destroyed) {
                    indicator.textContent = this.$pagesText(this.$visiblePages());
                }
            }, 2000);
        },

        $buildDialog: function () {
            const title = this.getAttribute('title')
                || fileNameFromUrl(this.getAttribute('pdf'))
                || QUILocale.get(lg, 'pdfPreview.open');

            this.$title = title;

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
                        <div class="quiqqer-bricks-pdfViewer__zoom" data-name="zoom" hidden>
                            <div class="quiqqer-bricks-pdfViewer__zoomPages" data-name="zoomPages"></div>
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

            const stage = dialog.querySelector('[data-name="stage"]');
            const zoom = dialog.querySelector('[data-name="zoom"]');

            stage.addEventListener('wheel', this.$onWheel, {passive: false});

            // Capture phase: a pinch must not reach StPageFlip as a swipe.
            stage.addEventListener('touchstart', this.$onTouchStart, {capture: true, passive: false});
            stage.addEventListener('touchmove', this.$onTouchMove, {capture: true, passive: false});
            stage.addEventListener('touchend', this.$onTouchEnd, {capture: true});
            stage.addEventListener('touchcancel', this.$onTouchEnd, {capture: true});

            zoom.addEventListener('pointerdown', this.$onZoomPointerDown);
            zoom.addEventListener('pointermove', this.$onZoomPointerMove);
            zoom.addEventListener('pointerup', this.$onZoomPointerUp);
            zoom.addEventListener('pointercancel', this.$onZoomPointerUp);

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

            [
                ['zoomOut', 'fa-magnifying-glass-minus', 'pdfPreview.viewer.zoomOut', this.zoomOut],
                ['zoomIn', 'fa-magnifying-glass-plus', 'pdfPreview.viewer.zoomIn', this.zoomIn]
            ].concat(this.getAttribute('id') ? [
                ['share', 'fa-share-nodes', 'pdfPreview.viewer.share', this.share]
            ] : []).forEach(([name, icon, locale, handler]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn btn-icon btn-rounded quiqqer-bricks-pdfViewer__btn';
                button.disabled = name !== 'share'; // zoom waits for the loaded book
                button.setAttribute('data-name', name);
                button.setAttribute('aria-label', QUILocale.get(lg, locale));
                button.innerHTML = '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>';
                button.addEventListener('click', handler);
                tools.appendChild(button);
            });

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
                showPageCorners: false,
                clickEventForward: true,
                startPage: startPage - 1
            });

            this.$pageFlip.on('init', () => {
                if (this.$destroyed) {
                    return;
                }

                const slider = this.$dialog.querySelector('[data-name="slider"]');
                slider.max = this.$numPages;
                slider.value = Math.min(this.$hashPage, this.$numPages);
                slider.disabled = this.$numPages < 2;
                this.$dialog.querySelector('[data-name="gridToggle"]').disabled = false;
                this.$updateZoomButtons();

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

                    if (this.$zoom > 1) {
                        this.$setZoom(this.$zoom);
                    }
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
            const text = this.$pagesText(pages);

            const indicator = this.$dialog.querySelector('[data-name="indicator"]');

            if (indicator.textContent !== text) {
                indicator.textContent = text;
                this.$status.textContent = text;
            }

            this.$updateSlider(pages, text);
            this.$updateGridCurrent(pages);

            this.$dialog.querySelector('[data-name="prev"]').disabled = first <= 1;
            this.$dialog.querySelector('[data-name="next"]').disabled = last >= this.$numPages;

            if (this.$currentPage !== first) {
                this.$currentPage = first;
                this.resetZoom();
                this.fireEvent('pageChange', [this, first]);
            }

            // Like the slider: keep a linked page while it is part of the view.
            if (!pages.includes(this.$hashPage)) {
                this.$hashPage = first;
            }

            this.$updateHistory();

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

                case '+':
                case '=':
                    this.zoomIn();
                    break;

                case '-':
                    this.zoomOut();
                    break;

                case '0':
                    this.resetZoom();
                    break;

                case 'Escape':
                    // Reset the zoom first; also stops the dialog cancel.
                    if (this.$zoom === 1) {
                        return;
                    }

                    this.resetZoom();
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
                // Double click / double tap zooms in at that point.
                clearTimeout(this.$tapTimer);
                this.$tapTimer = null;
                this.$setZoom(2, {
                    x: event.clientX,
                    y: event.clientY
                });
                return;
            }

            const rect = this.$book.getBoundingClientRect();
            const forward = event.clientX >= rect.left + rect.width / 2;

            this.$tapTimer = setTimeout(() => {
                this.$tapTimer = null;

                // A click on a page corner is flipped by StPageFlip itself
                // (after pointerup), so only turn when it did not.
                if (this.$destroyed || this.$dragged) {
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

        /**
         * @param {Number[]} pages - visible pages, 1-based
         * @return {String}
         */
        $pagesText: function (pages) {
            if (pages.length > 1) {
                return QUILocale.get(lg, 'pdfPreview.viewer.pages', {
                    from: pages[0],
                    to: pages[pages.length - 1],
                    total: this.$numPages
                });
            }

            return QUILocale.get(lg, 'pdfPreview.page', {
                page: pages[0],
                total: this.$numPages
            });
        },

        /**
         * Pages shown together with a page in the current orientation.
         *
         * @param {Number} page - 1-based
         * @return {Number[]}
         */
        $spreadFor: function (page) {
            if (!this.$isLandscape() || page === 1) {
                return [page];
            }

            const start = page % 2 === 0 ? page : page - 1;

            return [start, start + 1].filter(number => number <= this.$numPages);
        },

        $updateSlider: function (pages, text) {
            const slider = this.$dialog.querySelector('[data-name="slider"]');

            // Keep the chosen page when it is part of the shown double page,
            // otherwise the thumb would jump back to the left page.
            if (!pages.includes(Number(slider.value))) {
                slider.value = pages[0];
            }

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
            const text = this.$pagesText(this.$spreadFor(Number(slider.value)));

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
                return;
            }

            if (this.$zoom > 1) {
                event.preventDefault();
                this.resetZoom();
            }
        },

        $updateZoomButtons: function () {
            const zoomIn = this.$dialog.querySelector('[data-name="zoomIn"]');
            const zoomOut = this.$dialog.querySelector('[data-name="zoomOut"]');

            zoomIn.disabled = !this.$pageFlipLoaded || this.$zoom >= MAX_ZOOM;
            zoomOut.disabled = !this.$pageFlipLoaded || this.$zoom <= 1;
        },

        /**
         * Next or previous zoom level, also from in-between pinch values.
         */
        $zoomStep: function (direction, point) {
            const level = direction > 0
                ? ZOOM_LEVELS.find(value => value > this.$zoom + 0.01)
                : ZOOM_LEVELS.slice().reverse().find(value => value < this.$zoom - 0.01);

            if (level !== undefined) {
                this.$setZoom(level, point);
            }
        },

        /**
         * Zooms the visible pages and keeps the point under cursor or fingers.
         *
         * @param {Number} level - 1 to MAX_ZOOM
         * @param {Object} [point] - {x, y} client coordinates, default center
         */
        $setZoom: function (level, point) {
            if (!this.$pageFlipLoaded || this.$destroyed) {
                return;
            }

            level = Math.min(MAX_ZOOM, Math.max(1, level));

            if (level <= 1.001) {
                this.$exitZoom();
                return;
            }

            const layer = this.$dialog.querySelector('[data-name="zoom"]');
            const content = this.$dialog.querySelector('[data-name="zoomPages"]');
            let oldRect;

            if (this.$zoom === 1) {
                oldRect = this.$visibleBookRect();
                this.$enterZoom();
            } else {
                oldRect = content.getBoundingClientRect();
            }

            const layerRect = layer.getBoundingClientRect();
            const x = point ? point.x : layerRect.left + layerRect.width / 2;
            const y = point ? point.y : layerRect.top + layerRect.height / 2;
            const fractionX = Math.min(1, Math.max(0, (x - oldRect.left) / oldRect.width));
            const fractionY = Math.min(1, Math.max(0, (y - oldRect.top) / oldRect.height));

            this.$zoom = level;
            this.$layoutZoom();

            const newRect = content.getBoundingClientRect();
            layer.scrollLeft += newRect.left + fractionX * newRect.width - x;
            layer.scrollTop += newRect.top + fractionY * newRect.height - y;

            this.$updateZoomButtons();
            this.$scheduleZoomRender();
        },

        /**
         * Screen area of the visible book pages.
         */
        $visibleBookRect: function () {
            const rects = this.$visiblePages().map(page => this.$pageElements[page - 1].getBoundingClientRect());
            const left = Math.min(...rects.map(rect => rect.left));
            const top = Math.min(...rects.map(rect => rect.top));
            const right = Math.max(...rects.map(rect => rect.right));
            const bottom = Math.max(...rects.map(rect => rect.bottom));

            return {
                left: left,
                top: top,
                width: right - left,
                height: bottom - top
            };
        },

        /**
         * Replaces the book by the zoom layer with the visible pages. The book
         * canvases are copied as a blurred preview until the sharp render.
         */
        $enterZoom: function () {
            const layer = this.$dialog.querySelector('[data-name="zoom"]');
            const content = this.$dialog.querySelector('[data-name="zoomPages"]');

            content.replaceChildren();

            this.$visiblePages().forEach((page) => {
                const element = document.createElement('div');
                const rendered = this.$rendered.get(page);
                const thumbnail = this.$thumbnails.get(page);

                element.className = 'quiqqer-bricks-pdfViewer__zoomPage';
                element.setAttribute('data-name', 'zoomPage');
                element.setAttribute('data-page', page);

                if (rendered) {
                    const copy = document.createElement('canvas');
                    copy.width = rendered.canvas.width;
                    copy.height = rendered.canvas.height;
                    copy.getContext('2d').drawImage(rendered.canvas, 0, 0);
                    element.appendChild(copy);
                } else if (thumbnail) {
                    const image = document.createElement('img');
                    image.setAttribute('alt', '');
                    image.src = thumbnail;
                    element.appendChild(image);
                } else {
                    element.appendChild(this.$createLoader());
                }

                content.appendChild(element);
            });

            layer.hidden = false;
            layer.scrollLeft = 0;
            layer.scrollTop = 0;
            this.$dialog.classList.add('is-zoomed');
            this.$resetFlipTouch();
        },

        $layoutZoom: function () {
            const rect = this.$pageFlip.getBoundsRect();
            const width = Math.round(rect.pageWidth * this.$zoom);
            const height = Math.round(rect.height * this.$zoom);

            this.$dialog.querySelectorAll('[data-name="zoomPage"]').forEach((element) => {
                element.style.width = width + 'px';
                element.style.height = height + 'px';
            });
        },

        $exitZoom: function () {
            if (this.$zoom === 1 || !this.$dialog) {
                return;
            }

            const layer = this.$dialog.querySelector('[data-name="zoom"]');
            const content = this.$dialog.querySelector('[data-name="zoomPages"]');

            this.$zoom = 1;
            this.$cancelZoomRender();

            content.querySelectorAll('canvas').forEach((canvas) => {
                canvas.width = 0;
                canvas.height = 0;
            });

            content.replaceChildren();
            layer.hidden = true;
            this.$dialog.classList.remove('is-zoomed');
            this.$updateZoomButtons();
            this.$resetFlipTouch();
        },

        $cancelZoomRender: function () {
            this.$zoomGeneration++;
            clearTimeout(this.$zoomRenderTimer);
            this.$zoomTasks.forEach(task => task.cancel());
            this.$zoomTasks.clear();
        },

        $scheduleZoomRender: function () {
            this.$cancelZoomRender();
            this.$zoomRenderTimer = setTimeout(() => this.$renderZoom(), ZOOM_RENDER_DELAY);
        },

        /**
         * Renders the zoomed pages sharply, below the canvas pixel limit
         * (CSS scales up beyond it).
         */
        $renderZoom: async function () {
            const generation = this.$zoomGeneration;
            const elements = Array.from(this.$dialog.querySelectorAll('[data-name="zoomPage"]'));

            for (const element of elements) {
                let canvas = null;

                try {
                    const page = await this.$pdf.getPage(Number(element.getAttribute('data-page')));

                    if (this.$destroyed || generation !== this.$zoomGeneration) {
                        return;
                    }

                    const viewport = page.getViewport({scale: 1});
                    let scale = Math.min(
                        element.clientWidth / viewport.width,
                        element.clientHeight / viewport.height
                    ) * PdfRenderer.outputScale();

                    if (viewport.width * viewport.height * scale * scale > MAX_CANVAS_PIXELS) {
                        scale = Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height));
                    }

                    canvas = PdfRenderer.createCanvas(page, scale);

                    const task = PdfRenderer.render(page, canvas, scale);
                    this.$zoomTasks.add(task);

                    try {
                        await task.promise;
                    } finally {
                        this.$zoomTasks.delete(task);
                    }

                    if (this.$destroyed || generation !== this.$zoomGeneration) {
                        canvas.width = 0;
                        canvas.height = 0;
                        return;
                    }

                    element.querySelectorAll('canvas').forEach((previous) => {
                        previous.width = 0;
                        previous.height = 0;
                    });

                    element.replaceChildren(canvas);
                } catch (error) {
                    if (canvas) {
                        canvas.width = 0;
                        canvas.height = 0;
                    }

                    if (!this.$destroyed && error?.name !== 'RenderingCancelledException') {
                        console.error('Unable to render zoomed PDF page:', error);
                    }

                    return;
                }
            }
        },

        /**
         * Ends a touch StPageFlip may have started before a pinch took over.
         */
        $resetFlipTouch: function () {
            try {
                this.$pageFlip.userStop({x: 0, y: 0}, true);
            } catch (error) {
                // Nothing started yet.
            }
        },

        /**
         * Mouse wheel steps through the zoom levels, a trackpad pinch
         * (ctrlKey) zooms continuously. Horizontal scrolling pans while zoomed.
         */
        $onWheel: function (event) {
            if (!this.$pageFlipLoaded || this.$isGridOpen()) {
                return;
            }

            if (!event.ctrlKey && this.$zoom > 1 && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                return;
            }

            event.preventDefault();

            const point = {
                x: event.clientX,
                y: event.clientY
            };

            if (event.ctrlKey) {
                this.$setZoom(this.$zoom * Math.exp(-event.deltaY * 0.01), point);
                return;
            }

            const now = performance.now();

            if (now - this.$lastWheelStep < WHEEL_STEP_DELAY) {
                return;
            }

            this.$lastWheelStep = now;
            this.$zoomStep(event.deltaY < 0 ? 1 : -1, point);
        },

        $touchDistance: function (touches) {
            return Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
        },

        $touchCenter: function (touches) {
            return {
                x: (touches[0].clientX + touches[1].clientX) / 2,
                y: (touches[0].clientY + touches[1].clientY) / 2
            };
        },

        $onTouchStart: function (event) {
            if (event.touches.length !== 2 || !this.$pageFlipLoaded || this.$isGridOpen()) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            clearTimeout(this.$tapTimer);
            this.$tapTimer = null;

            this.$pinch = {
                distance: this.$touchDistance(event.touches),
                zoom: this.$zoom,
                ended: false
            };
        },

        $onTouchMove: function (event) {
            if (!this.$pinch) {
                return;
            }

            // Until all fingers are lifted StPageFlip sees nothing, a remaining
            // finger would otherwise count as a swipe. Native panning stays.
            event.stopPropagation();

            if (event.touches.length < 2) {
                return;
            }

            event.preventDefault();

            const distance = this.$touchDistance(event.touches);

            // Two fingers again after lifting one: continue from here.
            if (this.$pinch.ended) {
                this.$pinch = {
                    distance: distance,
                    zoom: this.$zoom,
                    ended: false
                };
            }

            this.$setZoom(
                this.$pinch.zoom * distance / this.$pinch.distance,
                this.$touchCenter(event.touches)
            );
        },

        $onTouchEnd: function (event) {
            if (!this.$pinch) {
                return;
            }

            event.stopPropagation();

            if (event.touches.length > 0) {
                if (event.touches.length < 2 && !this.$pinch.ended) {
                    this.$pinch.ended = true;

                    if (this.$zoom < 1.1) {
                        this.resetZoom();
                    }
                }

                return;
            }

            this.$pinch = null;

            if (this.$zoom < 1.1) {
                this.resetZoom();
            }

            // StPageFlip may start its touch after 250 ms, end it afterwards too.
            this.$resetFlipTouch();
            setTimeout(() => {
                if (!this.$destroyed) {
                    this.$resetFlipTouch();
                }
            }, 300);
        },

        /**
         * Zoom layer: mouse drag pans, a double tap/click resets the zoom.
         * Touch panning is native scrolling.
         */
        $onZoomPointerDown: function (event) {
            if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
                return;
            }

            const layer = event.currentTarget;

            this.$zoomPointer = {
                x: event.clientX,
                y: event.clientY,
                left: layer.scrollLeft,
                top: layer.scrollTop,
                moved: false,
                mouse: event.pointerType === 'mouse'
            };

            if (this.$zoomPointer.mouse) {
                layer.setPointerCapture(event.pointerId);
                layer.classList.add('is-panning');
            }
        },

        $onZoomPointerMove: function (event) {
            const pointer = this.$zoomPointer;

            if (!pointer || !event.isPrimary) {
                return;
            }

            const deltaX = event.clientX - pointer.x;
            const deltaY = event.clientY - pointer.y;

            if (Math.hypot(deltaX, deltaY) > TAP_DISTANCE) {
                pointer.moved = true;
            }

            if (pointer.mouse) {
                event.currentTarget.scrollLeft = pointer.left - deltaX;
                event.currentTarget.scrollTop = pointer.top - deltaY;
            }
        },

        $onZoomPointerUp: function (event) {
            const pointer = this.$zoomPointer;

            this.$zoomPointer = null;
            event.currentTarget.classList.remove('is-panning');

            if (!pointer || pointer.moved || event.type === 'pointercancel') {
                return;
            }

            const now = performance.now();

            if (now - this.$lastZoomTap < DOUBLE_TAP_DELAY) {
                this.$lastZoomTap = 0;
                this.resetZoom();
                return;
            }

            this.$lastZoomTap = now;
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
            this.$cancelZoomRender();
            this.$dialog.querySelectorAll('[data-name="zoomPages"] canvas').forEach((canvas) => {
                canvas.width = 0;
                canvas.height = 0;
            });

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

            clearTimeout(this.$announceTimer);
            this.$cleanupHistory();

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

    /**
     * @param {String} id - viewer id
     * @return {Number|null} page of a #<id>-<page> link in the current URL
     */
    Viewer.matchHash = matchHash;

    return Viewer;
});
