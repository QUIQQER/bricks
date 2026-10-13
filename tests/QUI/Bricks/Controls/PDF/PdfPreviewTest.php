<?php

namespace QUITests\Bricks\Controls\PDF;

use PHPUnit\Framework\TestCase;
use QUI\Bricks\Controls\PDF\PdfPreview;

class PdfPreviewTest extends TestCase
{
    public function testDownloadIsHiddenByDefault(): void
    {
        $Control = $this->createPreview();

        $this->assertStringNotContainsString('data-name="pdf-download"', $Control->getBody());
        $this->assertFalse($Control->getAttribute('showDownload'));
    }

    public function testDownloadRequiresAResolvedFile(): void
    {
        $Control = new PdfPreview([
            'showDownload' => true,
            'pdfFile' => 'not-a-media-url'
        ]);

        $this->assertStringNotContainsString('data-name="pdf-download"', $Control->getBody());
    }

    public function testDownloadUsesSameFileAndEscapesLabel(): void
    {
        $Control = $this->createPreview([
            'showDownload' => '1',
            'downloadLabel' => '<b>Report & details</b>',
            'content' => '<p>Introduction</p>'
        ]);
        $body = $Control->getBody();
        $Document = new \DOMDocument();
        $Document->loadHTML($body, LIBXML_NOERROR | LIBXML_NOWARNING);
        $XPath = new \DOMXPath($Document);
        $Download = $XPath->query('//a[@data-name="pdf-download"]')->item(0);
        $Preview = $XPath->query('//*[@data-name="pdf-preview-container"]')->item(0);

        $this->assertInstanceOf(\DOMElement::class, $Download);
        $this->assertInstanceOf(\DOMElement::class, $Preview);
        $this->assertSame($Preview->getAttribute('data-qui-options-pdffile'), $Download->getAttribute('href'));
        $this->assertTrue($Download->hasAttribute('download'));
        $this->assertStringContainsString('&lt;b&gt;Report &amp; details&lt;/b&gt;', $body);
        $this->assertSame(1, $XPath->query('//a[@data-name="pdf-download"]/i[@aria-hidden="true"]')->length);
        $this->assertLessThan(strpos($body, 'data-name="pdf-download"'), strpos($body, '<p>Introduction</p>'));
        $this->assertLessThan(strpos($body, 'data-name="pdf-preview-container"'), strpos($body, 'data-name="pdf-download"'));
    }

    public function testEmptyLabelUsesTranslatedDefault(): void
    {
        $Control = $this->createPreview([
            'showDownload' => true,
            'downloadLabel' => '  '
        ]);
        $label = \QUI::getLocale()->get('quiqqer/bricks', 'pdfPreview.download');

        $this->assertStringContainsString(htmlspecialchars($label, ENT_QUOTES), $Control->getBody());
    }

    public function testInvalidAlignmentFallsBackToLeft(): void
    {
        $Control = $this->createPreview(['downloadAlignment' => 'invalid']);
        $Control->getBody();

        $this->assertStringContainsString('--_q-controlConf-downloadAlignment:left', $Control->create());
    }

    public function testSupportedAlignmentsAreApplied(): void
    {
        foreach (['left', 'center', 'right'] as $alignment) {
            $Control = $this->createPreview(['downloadAlignment' => $alignment]);
            $Control->getBody();
            $this->assertStringContainsString('--_q-controlConf-downloadAlignment:' . $alignment, $Control->create());
        }
    }

    public function testStringFalseDoesNotEnableDownload(): void
    {
        $Control = $this->createPreview(['showDownload' => 'false']);

        $this->assertStringNotContainsString('data-name="pdf-download"', $Control->getBody());
    }

    public function testNavigationAndPlaceholdersUseNativeButtons(): void
    {
        $Control = $this->createPreview(['sheetsNumber' => 2]);
        $Document = new \DOMDocument();
        $Document->loadHTML($Control->getBody(), LIBXML_NOERROR | LIBXML_NOWARNING);
        $XPath = new \DOMXPath($Document);

        $this->assertSame(2, $XPath->query('//button[@type="button"][@data-name="sheet"]')->length);
        $this->assertSame(2, $XPath->query('//button[@aria-label][@data-name="prev" or @data-name="next"]')->length);
    }

    /**
     * Use a resolved media URL without depending on installation-specific media IDs.
     *
     * @param array<string, mixed> $attributes
     */
    private function createPreview(array $attributes = []): PdfPreview
    {
        $Control = $this->getMockBuilder(PdfPreview::class)
            ->setConstructorArgs([$attributes])
            ->onlyMethods(['getPdfFileUrl'])
            ->getMock();
        $Control->method('getPdfFileUrl')->willReturn('/media/report.pdf?version=1&language=en');

        return $Control;
    }
}
