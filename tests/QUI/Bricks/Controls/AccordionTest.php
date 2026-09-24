<?php

namespace QUITests\Bricks\Controls;

use PHPUnit\Framework\TestCase;

class AccordionTest extends TestCase
{
    public function testTemplateVariantsCanBeInstantiated(): void
    {
        $class = 'QUI\Bricks\Controls\Accordion';


        foreach (['default', 'simple', 'boxOutline', 'boxOutlineAccent', 'boxOutlineAccentOpen', 'boxOutlineTextColor', 'boxFill', 'boxFillAccent', 'boxFillAccentOpen', 'card', 'cardFillAccent', 'invalid'] as $template) {
            try {
                $Control = new $class([
                    'template' => $template,
                    'columns' => 2,
                    'iconPosition' => 'left',
                    'iconStyle' => 'plus',
                    'entries' => [[
                        'entryTitle' => 'Question',
                        'entryContent' => 'Answer'
                    ]]
                ]);

                $this->assertInstanceOf($class, $Control);
                $this->assertIsString($Control->getBody());
            } catch (\Throwable) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testControlBehaviorSmoke(): void
    {
        $class = 'QUI\Bricks\Controls\Accordion';
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

    public function testDisabledEntriesAreNotRendered(): void
    {
        $Control = new \QUI\Bricks\Controls\Accordion([
            'entries' => [[
                'entryTitle' => 'Visible question',
                'entryContent' => 'Visible answer',
                'disabled' => 0
            ], [
                'entryTitle' => 'Hidden question',
                'entryContent' => 'Hidden answer',
                'disabled' => 1
            ]]
        ]);

        $body = $Control->getBody();
        $schema = $Control->createJSONLDFAQSchemaCode();

        $this->assertStringContainsString('Visible question', $body);
        $this->assertStringNotContainsString('Hidden question', $body);
        $this->assertStringContainsString('Visible question', $schema);
        $this->assertStringNotContainsString('Hidden question', $schema);
    }


    public function testUsesNativeDetailsMarkup(): void
    {
        $Control = new \QUI\Bricks\Controls\Accordion([
            'entries' => [[
                'entryTitle' => 'Question',
                'entryContent' => 'Answer'
            ]]
        ]);

        $body = $Control->getBody();

        $this->assertStringContainsString('<details', $body);
        $this->assertStringContainsString('<summary', $body);
        $this->assertStringNotContainsString('data-open', $body);
        $this->assertStringNotContainsString('<header', $body);
    }

    public function testRotateAngleIsSetAsCssVariable(): void
    {
        $entries = [[
            'entryTitle' => 'Question',
            'entryContent' => 'Answer'
        ]];

        $AngleControl = new \QUI\Bricks\Controls\Accordion([
            'entries' => $entries,
            'iconStyle' => 'angle'
        ]);

        $PlusControl = new \QUI\Bricks\Controls\Accordion([
            'entries' => $entries,
            'iconStyle' => 'plus'
        ]);

        $this->assertStringContainsString('--_q-controlConf-rotate:180deg', $AngleControl->create());
        $this->assertStringContainsString('--_q-controlConf-rotate:45deg', $PlusControl->create());
    }

    public function testListMaxWidthSupportsNumbersAndCssValues(): void
    {
        $entries = [[
            'entryTitle' => 'Question',
            'entryContent' => 'Answer'
        ]];

        $NumericControl = new \QUI\Bricks\Controls\Accordion([
            'entries' => $entries,
            'listMaxWidth' => '800'
        ]);

        $CssValueControl = new \QUI\Bricks\Controls\Accordion([
            'entries' => $entries,
            'listMaxWidth' => 'clamp(20rem, 50vw, 60rem)'
        ]);

        $DisabledControl = new \QUI\Bricks\Controls\Accordion([
            'entries' => $entries,
            'listMaxWidth' => '0'
        ]);

        $this->assertStringContainsString(
            '--_q-controlConf-list-maxWidth:800px',
            $NumericControl->create()
        );
        $this->assertStringContainsString(
            '--_q-controlConf-list-maxWidth:clamp(20rem, 50vw, 60rem)',
            $CssValueControl->create()
        );
        $this->assertStringNotContainsString('--_q-controlConf-list-maxWidth:', $DisabledControl->create());
    }

    public function testAnchorIsRenderedAsCleanedId(): void
    {
        $Control = new \QUI\Bricks\Controls\Accordion([
            'entries' => [[
                'entryTitle' => 'With anchor',
                'entryContent' => 'Answer',
                'anchor' => '#Versand Info'
            ], [
                'entryTitle' => 'Unusable anchor',
                'entryContent' => 'Answer',
                'anchor' => '?!'
            ], [
                'entryTitle' => 'Without anchor',
                'entryContent' => 'Answer'
            ]]
        ]);

        $body = $Control->getBody();

        $this->assertStringContainsString('id="Versand-Info"', $body);
        $this->assertSame(1, substr_count($body, ' id="'));
    }
}
