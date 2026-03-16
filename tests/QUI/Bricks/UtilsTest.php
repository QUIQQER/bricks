<?php

namespace QUITests\Bricks;

use DOMDocument;
use DOMXPath;
use PHPUnit\Framework\TestCase;
use QUI\Bricks\Utils;

class UtilsTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/quiqqer-bricks-tests-' . md5((string)mt_rand());
        mkdir($this->tmpDir, 0777, true);
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        if (!is_dir($this->tmpDir)) {
            return;
        }

        $files = scandir($this->tmpDir);

        if (is_array($files)) {
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }

                @unlink($this->tmpDir . '/' . $file);
            }
        }

        @rmdir($this->tmpDir);
    }

    public function testGetBricksFromXmlAndParseArea(): void
    {
        $xmlFile = $this->tmpDir . '/bricks.xml';

        file_put_contents($xmlFile, <<<'XML'
<?xml version="1.0"?>
<quiqqer>
  <bricks>
    <brick control="*" name="ignored"/>
    <brick control="\\Vendor\\Brick" name="hero" deprecated="1" hasContent="0" cacheable="0" recommended="1" inheritance="1" priority="10">
      <title><locale group="g1" var="titleVar"/></title>
      <description><locale group="g1" var="descVar"/></description>
      <mockups>
        <mockup src="/a.png"/>
        <mockup src="/thumb.png" type="thumbnail"/>
        <mockup src="/preview.png" type="preview"/>
      </mockups>
    </brick>
  </bricks>
</quiqqer>
XML
        );

        $bricks = Utils::getBricksFromXML($xmlFile);

        $this->assertCount(1, $bricks);
        $this->assertSame('hero', $bricks[0]['name']);
        $this->assertSame('\\\\Vendor\\\\Brick', $bricks[0]['control']);
        $this->assertSame(0, $bricks[0]['hasContent']);
        $this->assertSame(0, $bricks[0]['cacheable']);
        $this->assertSame(1, $bricks[0]['recommended']);
        $this->assertSame(1, $bricks[0]['deprecated']);
        $this->assertSame('/preview.png', $bricks[0]['mockup']);
        $this->assertSame('/thumb.png', $bricks[0]['thumbnail']);
        $this->assertCount(3, $bricks[0]['mockups']);
        $this->assertSame(['/a.png'], $bricks[0]['galleryMockups']);
    }

    public function testGetTemplateAreasFromXmlWithFilters(): void
    {
        $xmlFile = $this->tmpDir . '/template.xml';

        file_put_contents($xmlFile, <<<'XML'
<?xml version="1.0"?>
<quiqqer>
  <bricks>
    <templateAreas>
      <areas>
        <area control="\\Global\\Area" name="globalArea"/>
      </areas>
      <layouts>
        <layout layout="layoutA">
          <area control="\\Layout\\Area" name="layoutArea"/>
        </layout>
        <layout layout="layoutB">
          <area control="\\Layout\\AreaB" name="layoutAreaB"/>
        </layout>
      </layouts>
      <siteTypes>
        <type type="typeA">
          <area control="\\Type\\Area" name="siteTypeArea"/>
        </type>
      </siteTypes>
    </templateAreas>
  </bricks>
</quiqqer>
XML
        );

        $allAreas = Utils::getTemplateAreasFromXML($xmlFile);
        $this->assertCount(4, $allAreas);

        $filtered = Utils::getTemplateAreasFromXML($xmlFile, 'layoutA', 'typeA');
        $this->assertCount(3, $filtered);

        $names = array_map(static fn(array $entry): string => $entry['name'], $filtered);
        $this->assertContains('globalArea', $names);
        $this->assertContains('layoutArea', $names);
        $this->assertContains('siteTypeArea', $names);
    }

    public function testParseAreaToArrayDefaultsWithoutAttributes(): void
    {
        $doc = new DOMDocument();
        $doc->loadXML('<root><area/></root>');

        $area = $doc->getElementsByTagName('area')->item(0);
        $this->assertNotNull($area);

        $xpath = new DOMXPath($doc);
        $parsed = Utils::parseAreaToArray($area, $xpath);

        $this->assertSame('', $parsed['control']);
        $this->assertSame('', $parsed['name']);
        $this->assertSame(1, $parsed['hasContent']);
        $this->assertSame(1, $parsed['cacheable']);
        $this->assertSame(0, $parsed['deprecated']);
    }
}
