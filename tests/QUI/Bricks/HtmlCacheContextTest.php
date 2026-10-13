<?php

namespace QUITests\Bricks;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use QUI;
use QUI\Bricks\Brick;
use QUI\Cache\Manager as CacheManager;

class HtmlCacheContextTest extends TestCase
{
    /**
     * @return iterable<string, array{list<bool>}>
     */
    public static function requestSequences(): iterable
    {
        yield 'original first' => [[false, true, true, false]];
        yield 'WebP first' => [[true, false, false, true]];
    }

    /**
     * @param list<bool> $requests
     */
    #[DataProvider('requestSequences')]
    public function testBrickRendersAndCachesEachImageContextSeparately(array $requests): void
    {
        $Control = new class extends QUI\Control {
            public bool $webp = false;
            public int $renders = 0;

            public function create(): string
            {
                $this->renders++;
                $source = $this->webp ? '<source type="image/webp" srcset="/media/cache/demo/image.webp">' : '';

                return '<picture>' . $source . '<img src="/media/cache/demo/image.jpg"></picture>';
            }
        };
        $Brick = new Brick([
            'type' => 'content',
            'uniqueId' => 'phpunit-html-context-' . uniqid()
        ]);
        $Brick->setAttribute('type', 'test-control');
        (new \ReflectionProperty($Brick, 'Control'))->setValue($Brick, $Control);
        $getCacheName = new \ReflectionMethod($Brick, 'getCacheName');
        $listener = static function (array &$context) use ($Control): void {
            $context['test.webp'] = $Control->webp;
        };
        $Events = QUI::getEvents();
        $Config = CacheManager::getConfig();
        $original = $Config->getSection('general');
        $keys = [];
        $Events->addEvent('onQuiqqerBricksHtmlCacheContext', $listener);

        try {
            $Config->set('general', 'nocache', 0);
            $firstKey = $getCacheName->invoke($Brick, $Brick->getSettings());
            $legacyKey = explode('/html-v2/', $firstKey)[0];
            $keys[] = $legacyKey;
            CacheManager::set($legacyKey, [
                'html' => 'legacy HTML must not be reused',
                'cssFiles' => [],
                'cssClasses' => []
            ]);

            foreach ($requests as $index => $webp) {
                $Control->webp = $webp;
                $keys[] = $getCacheName->invoke($Brick, $Brick->getSettings());
                $html = $Brick->create();

                $this->assertStringNotContainsString('legacy HTML', $html);
                $this->assertSame((int)$webp, substr_count($html, 'type="image/webp"'));
                $this->assertStringContainsString('src="/media/cache/demo/image.jpg"', $html);
                $this->assertSame(min($index + 1, 2), $Control->renders, 'Reuse each cached variant.');
            }
        } finally {
            $Events->removeEvent('onQuiqqerBricksHtmlCacheContext', $listener);

            foreach (array_unique($keys) as $key) {
                CacheManager::clear($key);
            }

            if (is_array($original)) {
                $Config->setSection('general', $original);
            } else {
                $Config->del('general');
            }
        }
    }
}
