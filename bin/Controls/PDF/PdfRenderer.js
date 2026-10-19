/**
 * Shared pdf.js loader for the PDF preview and the PDF viewer.
 *
 * Loads pdf.js once and keeps one document per URL, so the preview and the
 * viewer share the same parsed PDF. Every acquire() needs a matching
 * release(); the document is destroyed when the last user releases it.
 *
 * @module package/quiqqer/bricks/bin/Controls/PDF/PdfRenderer
 */
define('package/quiqqer/bricks/bin/Controls/PDF/PdfRenderer', function () {
    "use strict";

    const PDFJS_URL = URL_OPT_DIR + 'bin/quiqqer-asset/pdfjs-dist/pdfjs-dist/build/pdf.mjs';
    const PDFJS_WORKER_URL = URL_OPT_DIR + 'bin/quiqqer-asset/pdfjs-dist/pdfjs-dist/build/pdf.worker.min.mjs';

    let libraryPromise = null;
    const documents = new Map();

    function loadLibrary() {
        if (!libraryPromise) {
            libraryPromise = import(PDFJS_URL).then((pdfjs) => {
                pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
                return pdfjs;
            }).catch((error) => {
                libraryPromise = null;
                throw error;
            });
        }

        return libraryPromise;
    }

    return {
        /**
         * @param {String} url
         * @return {Promise<PDFDocumentProxy>}
         */
        acquire: function (url) {
            let entry = documents.get(url);

            if (!entry) {
                entry = {
                    loadingTask: null,
                    promise: null,
                    refs: 0
                };

                entry.promise = loadLibrary().then((pdfjs) => {
                    if (documents.get(url) !== entry) {
                        throw new Error('PDF document was released while loading.');
                    }

                    entry.loadingTask = pdfjs.getDocument(url);
                    return entry.loadingTask.promise;
                });

                // A failed document must not stay cached for later callers.
                entry.promise.catch(() => {
                    if (documents.get(url) === entry) {
                        documents.delete(url);
                    }
                });

                documents.set(url, entry);
            }

            entry.refs++;

            return entry.promise;
        },

        /**
         * @param {String} url
         */
        release: function (url) {
            const entry = documents.get(url);

            if (!entry) {
                return;
            }

            entry.refs--;

            if (entry.refs > 0) {
                return;
            }

            documents.delete(url);

            if (entry.loadingTask) {
                entry.loadingTask.destroy().catch((error) => {
                    console.error('Unable to release PDF:', error);
                });
            }
        },

        /**
         * @param {PDFPageProxy} page
         * @param {Number} scale
         * @return {HTMLCanvasElement}
         */
        createCanvas: function (page, scale) {
            const viewport = page.getViewport({scale});
            const canvas = document.createElement('canvas');

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            return canvas;
        },

        /**
         * @param {PDFPageProxy} page
         * @param {HTMLCanvasElement} canvas
         * @param {Number} scale
         * @return {RenderTask}
         */
        render: function (page, canvas, scale) {
            return page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: page.getViewport({scale})
            });
        },

        /**
         * Device pixel ratio, capped to keep canvas memory in check.
         *
         * @param {Number} [cap]
         * @return {Number}
         */
        outputScale: function (cap = 2) {
            return Math.min(window.devicePixelRatio || 1, cap);
        }
    };
});
