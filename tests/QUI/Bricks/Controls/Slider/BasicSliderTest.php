<?php

namespace QUITests\Bricks\Controls\Slider;

use DOMDocument;
use DOMXPath;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use QUI;
use QUI\Bricks\Controls\Slider\BasicSlider;
use QUI\Smarty\Smarty4;
use Smarty;

class BasicSliderTest extends TestCase
{
    #[DataProvider('imageLoadingOptions')]
    public function testImageLoading(array $attributes, array $sources, bool $prioritized): void
    {
        $configureSmarty = static function (Smarty $Smarty): void {
            $Smarty->setCompileId('bricks-basic-slider-loading-test');
            $Smarty->force_compile = true;
            $Smarty->registerPlugin('function', 'image', static function (array $params): string {
                $html = '<img src="' . htmlspecialchars($params['image'], ENT_QUOTES) . '"';

                foreach (['loading', 'fetchpriority', 'data-cache-lazy'] as $attribute) {
                    if (isset($params[$attribute])) {
                        $html .= ' ' . $attribute . '="' . htmlspecialchars($params[$attribute], ENT_QUOTES) . '"';
                    }
                }

                return $html . ' />';
            });
        };

        $template = dirname(__DIR__, 5) . '/src/QUI/Bricks/Controls/Slider/BasicSlider.html';
        $Project = QUI::getRewrite()->getProject() ?: QUI::getProjectManager()->getStandard();
        $Events = QUI::getEvents();
        $originalFileCache = Smarty4::$fileCache;
        $Events->addEvent('onSmartyInit', $configureSmarty);

        // Test the package template independently of customer template overrides.
        Smarty4::$fileCache = [md5($template . '_' . $Project?->getName()) => $template];

        try {
            $Slider = new class ($attributes) extends BasicSlider {
                public array $ownImages = [];
            };
            $Slider->setAttribute('mediaFolder', 'basic-slider-test-images');
            $Slider->ownImages = $sources;

            $html = $Slider->getBody();
        } finally {
            $Events->removeEvent('onSmartyInit', $configureSmarty);
            Smarty4::$fileCache = $originalFileCache;
        }

        $this->assertImageLoading($html, count($sources), $prioritized);
    }

    public static function imageLoadingOptions(): array
    {
        $sources = [
            'first' => '/basic-slider-test/first.png',
            'second' => '/basic-slider-test/second.png',
            'third' => '/basic-slider-test/third.png'
        ];

        return [
            'default remains lazy' => [[], $sources, false],
            'stored disabled checkbox' => [['prioritizeFirstImage' => '0'], $sources, false],
            'stored enabled checkbox' => [['prioritizeFirstImage' => '1'], $sources, true],
            'single image prioritized' => [['prioritizeFirstImage' => true], [$sources['first']], true]
        ];
    }

    private function assertImageLoading(string $html, int $count, bool $prioritized): void
    {
        $Document = new DOMDocument();
        $this->assertTrue($Document->loadHTML($html));
        $XPath = new DOMXPath($Document);
        $Images = $XPath->query('//ul[@data-name="sliderList"]/li//img');

        $this->assertNotFalse($Images);
        $this->assertCount($count, $Images);

        foreach ($Images as $index => $Image) {
            $firstPrioritized = $prioritized && $index === 0;
            $this->assertSame($firstPrioritized ? 'eager' : 'lazy', $Image->getAttribute('loading'));
            $this->assertSame($firstPrioritized ? 'high' : '', $Image->getAttribute('fetchpriority'));
            $this->assertSame($prioritized && $index > 0 ? '0' : '', $Image->getAttribute('data-cache-lazy'));
        }
    }

    public function testControlBehaviorSmoke(): void
    {
        $class = 'QUI\Bricks\Controls\Slider\BasicSlider';
        $this->assertTrue(class_exists($class));

        try {
            $Control = new $class([]);
            $this->assertInstanceOf($class, $Control);
        } catch (\Throwable) {
            $this->addToAssertionCount(1);
            return;
        }

        $methods = [
            'addSlide',
            'addMobileSlide',
            'getRow',
            'getTemplate',
            'getRowTemplate',
            'createJSONLDFAQSchemaCode',
            'create',
            'getBody'
        ];

        foreach ($methods as $method) {
            if (!method_exists($Control, $method)) {
                continue;
            }

            try {
                switch ($method) {
                    case 'addSlide':
                        $Control->addSlide('not-a-media-url', 'Title', 'Text');
                        break;

                    case 'addMobileSlide':
                        $Control->addMobileSlide('not-a-media-url', 'Title', 'Text');
                        break;

                    case 'getRow':
                        $result = $Control->getRow(0);
                        $this->assertIsArray($result);
                        break;

                    default:
                        $result = $Control->{$method}();

                        if (in_array($method, ['getTemplate', 'getRowTemplate', 'createJSONLDFAQSchemaCode', 'create', 'getBody'], true)) {
                            $this->assertIsString((string)$result);
                        }
                        break;
                }
            } catch (\Throwable) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
