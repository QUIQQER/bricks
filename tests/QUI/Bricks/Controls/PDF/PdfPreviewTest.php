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

    public function testPageAnimationDefaultsToFade(): void
    {
        $Control = $this->createPreview();

        $this->assertSame('fade', $Control->getAttribute('pageAnimation'));
        $this->assertStringContainsString('data-qui-options-pageanimation="fade"', $Control->getBody());
    }

    public function testPageAnimationSupportsAllModes(): void
    {
        foreach (['none', 'fade', 'zoom'] as $animation) {
            $Control = $this->createPreview(['pageAnimation' => $animation]);

            $this->assertStringContainsString(
                'data-qui-options-pageanimation="' . $animation . '"',
                $Control->getBody()
            );
        }
    }

    public function testInvalidPageAnimationFallsBackToFade(): void
    {
        foreach (['', 'invalid', '"><script>alert(1)</script>'] as $animation) {
            $Control = $this->createPreview(['pageAnimation' => $animation]);
            $body = $Control->getBody();

            $this->assertStringContainsString('data-qui-options-pageanimation="fade"', $body);
            $this->assertStringNotContainsString('<script>', $body);
        }
    }

    public function testLayoutDefaultsToClassic(): void
    {
        $Control = $this->createPreview(['sheetsNumber' => 2]);
        $XPath = $this->createXPath($Control->getBody());

        $this->assertSame('classic', $Control->getAttribute('layout'));
        $this->assertSame(1, $XPath->query('//*[@data-name="pdf-preview-container"][@data-qui-options-layout="classic"]')->length);
        $this->assertSame(2, $XPath->query('//*[@data-name="sheet"]')->length);
        $this->assertSame(0, $XPath->query('//*[@data-name="pdf-teaser"]')->length);
    }

    public function testInvalidLayoutFallsBackToClassic(): void
    {
        foreach (['', 'invalid', '"><script>alert(1)</script>'] as $layout) {
            $Control = $this->createPreview(['layout' => $layout]);
            $body = $Control->getBody();

            $this->assertStringContainsString('data-qui-options-layout="classic"', $body);
            $this->assertStringNotContainsString('<script>', $body);
            $this->assertStringContainsString('quiqqer-bricks-controls-pdf-pdfPreview--classic', $Control->create());
        }
    }

    public function testTeaserRendersTextAndCoverWithoutSheets(): void
    {
        $Control = $this->createPreview([
            'layout' => 'teaser',
            'sheetsNumber' => 3
        ]);
        $XPath = $this->createXPath($Control->getBody());

        $this->assertSame(1, $XPath->query('//*[@data-name="pdf-teaser"]')->length);
        $this->assertSame(0, $XPath->query('//*[@data-name="sheet"]')->length);
        $this->assertSame(1, $XPath->query('//button[@type="button"][@data-name="open"]')->length);
        $this->assertSame(1, $XPath->query('//*[@data-name="cover"][@aria-hidden="true"]')->length);
        $this->assertSame(
            1,
            $XPath->query('//*[@data-name="pdf-preview-container"][@data-qui-options-layout="teaser"]')->length
        );
        $this->assertStringContainsString('quiqqer-bricks-controls-pdf-pdfPreview--teaser', $Control->create());
    }

    public function testTeaserPdfPositionIsValidated(): void
    {
        $positions = [
            'left' => 'left',
            'right' => 'right',
            'invalid' => 'right',
            '"><script>alert(1)</script>' => 'right'
        ];

        foreach ($positions as $position => $expected) {
            $Control = $this->createPreview([
                'layout' => 'teaser',
                'pdfPosition' => $position
            ]);
            $body = $Control->getBody();

            $this->assertStringContainsString('data-pdf-position="' . $expected . '"', $body);
            $this->assertStringNotContainsString('<script>', $body);
        }
    }

    public function testTeaserTitleAndContentNotDuplicated(): void
    {
        $Control = $this->createPreview([
            'layout' => 'teaser',
            'frontendTitle' => 'Catalog',
            'content' => '<p>Introduction</p>'
        ]);
        $XPath = $this->createXPath($Control->getBody());

        $this->assertSame(1, $XPath->query('//*[contains(@class, "control-content")]')->length);
        $this->assertSame(1, $XPath->query('//*[contains(@class, "control-header")]')->length);
        $this->assertSame(
            1,
            $XPath->query('//*[contains(@class, "quiqqer-bricks-pdfPreview-teaser__text")]//*[contains(@class, "control-content")]')->length
        );
    }

    public function testTeaserButtonsAreBelowTheCover(): void
    {
        $Control = $this->createPreview([
            'layout' => 'teaser',
            'showDownload' => true
        ]);
        $XPath = $this->createXPath($Control->getBody());
        $Actions = $XPath->query('//*[@data-name="actions"]')->item(0);

        $this->assertInstanceOf(\DOMElement::class, $Actions);
        $this->assertSame(1, $XPath->query('//a[@data-name="pdf-download"]')->length);
        $this->assertSame(
            ['pdf-download', 'open'],
            array_map(
                fn(\DOMElement $Button): string => $Button->getAttribute('data-name'),
                iterator_to_array($XPath->query('./a | ./button', $Actions))
            )
        );
        $this->assertSame(
            0,
            $XPath->query('//*[contains(@class, "quiqqer-bricks-pdfPreview-teaser__text")]//a[@data-name="pdf-download"]')->length
        );
    }

    public function testTeaserWithoutDownloadShowsOnlyOpenButton(): void
    {
        $XPath = $this->createXPath($this->createPreview(['layout' => 'teaser'])->getBody());

        $this->assertSame(0, $XPath->query('//a[@data-name="pdf-download"]')->length);
        $this->assertSame(1, $XPath->query('//*[@data-name="actions"]/button[@data-name="open"]')->length);
    }

    public function testOpenLabelEscapedAndDefault(): void
    {
        $Control = $this->createPreview([
            'layout' => 'teaser',
            'openLabel' => '<b>Open & read</b>'
        ]);

        $this->assertStringContainsString('&lt;b&gt;Open &amp; read&lt;/b&gt;', $Control->getBody());

        $Control = $this->createPreview([
            'layout' => 'teaser',
            'openLabel' => '  '
        ]);
        $label = \QUI::getLocale()->get('quiqqer/bricks', 'pdfPreview.open');

        $this->assertStringContainsString(htmlspecialchars($label, ENT_QUOTES), $Control->getBody());
    }

    public function testOpenViewerOptionClassic(): void
    {
        $Control = $this->createPreview();

        $this->assertStringContainsString('data-qui-options-openviewer="1"', $Control->getBody());

        foreach (['0', false, 'false'] as $value) {
            $Control = $this->createPreview(['openViewer' => $value]);

            $this->assertStringContainsString('data-qui-options-openviewer="0"', $Control->getBody());
        }
    }

    public function testClassicOpenButtonFollowsOpenViewer(): void
    {
        $XPath = $this->createXPath($this->createPreview()->getBody());

        $this->assertSame(
            1,
            $XPath->query('//*[@data-name="preview"]/button[@type="button"][@data-name="open"][@aria-label]')->length
        );
        $this->assertSame(1, $XPath->query('//button[@data-name="open"]/i[@aria-hidden="true"]')->length);

        $XPath = $this->createXPath($this->createPreview(['openViewer' => false])->getBody());

        $this->assertSame(0, $XPath->query('//button[@data-name="open"]')->length);
    }

    public function testTitleIsMarkedForTheViewer(): void
    {
        foreach (['classic', 'teaser'] as $layout) {
            $Control = $this->createPreview([
                'layout' => $layout,
                'frontendTitle' => 'Catalog'
            ]);
            $XPath = $this->createXPath($Control->getBody());

            $this->assertSame(1, $XPath->query('//h2[@data-name="pdf-title"]')->length);
        }
    }

    public function testTeaserWithoutPdfRendersOnlyText(): void
    {
        $Control = new PdfPreview([
            'layout' => 'teaser',
            'pdfFile' => 'not-a-media-url',
            'content' => '<p>Introduction</p>'
        ]);
        $XPath = $this->createXPath($Control->getBody());

        $this->assertSame(1, $XPath->query('//*[@data-name="pdf-teaser"]')->length);
        $this->assertSame(0, $XPath->query('//*[@data-name="pdf-preview-container"]')->length);
        $this->assertSame(0, $XPath->query('//*[@data-name="open"]')->length);
        $this->assertSame(1, $XPath->query('//*[contains(@class, "control-content")]')->length);
    }

    private function createXPath(string $body): \DOMXPath
    {
        $Document = new \DOMDocument();
        $Document->loadHTML($body, LIBXML_NOERROR | LIBXML_NOWARNING);

        return new \DOMXPath($Document);
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
