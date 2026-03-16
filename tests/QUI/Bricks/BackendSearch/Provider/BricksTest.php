<?php

namespace QUITests\Bricks\BackendSearch\Provider;

use PHPUnit\Framework\TestCase;
use QUI\Bricks\BackendSearch\Provider\Bricks;

class BricksTest extends TestCase
{
    public function testSearchReturnsEmptyForEmptySearchString(): void
    {
        $Provider = new Bricks();

        $this->assertSame([], $Provider->search(''));
        $this->assertSame([], $Provider->search('   '));
    }

    public function testSearchReturnsEmptyIfBrickFilterIsNotSelected(): void
    {
        $Provider = new Bricks();

        $this->assertSame([], $Provider->search('footer', [
            'filterGroups' => ['sites']
        ]));
    }

    public function testGetEntryReturnsEmptyArrayForInvalidIdentifier(): void
    {
        $Provider = new Bricks();

        $this->assertSame([], $Provider->getEntry('invalid'));
    }

    public function testGetEntryReturnsBackendSearchPayload(): void
    {
        $Provider = new Bricks();
        $result = $Provider->getEntry('project-de-15');

        $this->assertArrayHasKey('searchdata', $result);

        $payload = json_decode($result['searchdata'], true);

        $this->assertIsArray($payload);
        $this->assertSame(
            'package/quiqqer/bricks/bin/BackendSearch/Provider/Bricks',
            $payload['require']
        );
        $this->assertSame('project', $payload['params']['projectName']);
        $this->assertSame('de', $payload['params']['projectLang']);
        $this->assertSame('15', $payload['params']['id']);
    }

    public function testGetFilterGroupsReturnsBrickFilterDefinition(): void
    {
        $Provider = new Bricks();

        $this->assertSame([
            [
                'group' => Bricks::FILTER_GROUP,
                'label' => [
                    'quiqqer/bricks',
                    'search.provider.bricks.filter.label'
                ]
            ]
        ], $Provider->getFilterGroups());
    }
}
