<?php

namespace QUI\Bricks\Controls\PDF;

use QUI;

class PdfPreview extends QUI\Control
{
    /**
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'class' => 'quiqqer-bricks-controls-pdf-pdfPreview',
//            'qui-class' => 'package/quiqqer/bricks/bin/Controls/PDF/PdfPreviewBrick',
            'pdfFile' => '',
            'aspectRatio' => '210/297',
            'showDownload' => false,
            'downloadLabel' => '',
            'pageAnimation' => 'fade',
            'layout' => 'classic',
            'pdfPosition' => 'right',
            'openLabel' => '',
            'openViewer' => true
        ]);

        $this->addCSSFile(OPT_DIR . 'quiqqer/bricks/bin/Controls/PDF/PdfPreview.css');

        parent::__construct($attributes);
    }

    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();
        $pdfFile = $this->getPdfFileUrl();

        $downloadLabel = trim((string)$this->getAttribute('downloadLabel'));

        if ($downloadLabel === '') {
            $downloadLabel = QUI::getLocale()->get('quiqqer/bricks', 'pdfPreview.download');
        }

        $pageAnimation = (string)$this->getAttribute('pageAnimation');

        if (!in_array($pageAnimation, ['none', 'fade', 'zoom'], true)) {
            $pageAnimation = 'fade';
        }

        $layout = (string)$this->getAttribute('layout');

        if (!in_array($layout, ['classic', 'teaser'], true)) {
            $layout = 'classic';
        }

        $this->addCSSClass('quiqqer-bricks-controls-pdf-pdfPreview--' . $layout);

        $pdfPosition = (string)$this->getAttribute('pdfPosition');

        if (!in_array($pdfPosition, ['left', 'right'], true)) {
            $pdfPosition = 'right';
        }

        $openLabel = trim((string)$this->getAttribute('openLabel'));

        if ($openLabel === '') {
            $openLabel = QUI::getLocale()->get('quiqqer/bricks', 'pdfPreview.open');
        }

        $Engine->assign([
            'this' => $this,
            'pdfFile' => $pdfFile,
            'sheetsNumber' => $this->getAttribute('sheetsNumber'),
            'aspectRatio' => $this->getAttribute('aspectRatio'),
            'showDownload' => filter_var($this->getAttribute('showDownload'), FILTER_VALIDATE_BOOLEAN),
            'downloadLabel' => $downloadLabel,
            'pageAnimation' => $pageAnimation,
            'layout' => $layout,
            'pdfPosition' => $pdfPosition,
            'openLabel' => $openLabel,
            'openViewer' => filter_var($this->getAttribute('openViewer'), FILTER_VALIDATE_BOOLEAN)
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/PdfPreview.html');
    }

    protected function getPdfFileUrl(): string
    {
        if ($this->getAttribute('pdfFile')) {
            try {
                $file = QUI\Projects\Media\Utils::getMediaItemByUrl($this->getAttribute('pdfFile'));
                return $file->getUrl(true);
            } catch (\Exception) {
            }
        }

        return '';
    }
}
