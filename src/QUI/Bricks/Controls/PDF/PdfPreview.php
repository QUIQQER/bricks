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
            'downloadAlignment' => 'left',
            'pageAnimation' => 'fade'
        ]);

        $this->addCSSFile(OPT_DIR . 'quiqqer/bricks/bin/Controls/PDF/PdfPreview.css');

        parent::__construct($attributes);
    }

    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();
        $pdfFile = $this->getPdfFileUrl();

        $downloadAlignment = (string)$this->getAttribute('downloadAlignment');

        if (!in_array($downloadAlignment, ['left', 'center', 'right'], true)) {
            $downloadAlignment = 'left';
        }

        $this->setStyle('--_q-controlConf-downloadAlignment', $downloadAlignment);

        $downloadLabel = trim((string)$this->getAttribute('downloadLabel'));

        if ($downloadLabel === '') {
            $downloadLabel = QUI::getLocale()->get('quiqqer/bricks', 'pdfPreview.download');
        }

        $pageAnimation = (string)$this->getAttribute('pageAnimation');

        if (!in_array($pageAnimation, ['none', 'fade', 'zoom'], true)) {
            $pageAnimation = 'fade';
        }

        $Engine->assign([
            'this' => $this,
            'pdfFile' => $pdfFile,
            'sheetsNumber' => $this->getAttribute('sheetsNumber'),
            'aspectRatio' => $this->getAttribute('aspectRatio'),
            'showDownload' => filter_var($this->getAttribute('showDownload'), FILTER_VALIDATE_BOOLEAN),
            'downloadLabel' => $downloadLabel,
            'pageAnimation' => $pageAnimation
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
