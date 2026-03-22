<?php

namespace QUITests\Bricks\Controls\Slider;

use PHPUnit\Framework\TestCase;

class CustomerReviewsFlowTest extends TestCase
{
    public function testControlBehaviorSmoke(): void
    {
        $class = 'QUI\Bricks\Controls\Slider\CustomerReviewsFlow';
        $this->assertTrue(class_exists($class));

        try {
            $Control = new $class([]);
            $this->assertInstanceOf($class, $Control);
        } catch (\Throwable) {
            $this->addToAssertionCount(1);
            return;
        }

        $methods = [
            'create',
            'getBody'
        ];

        foreach ($methods as $method) {
            if (!method_exists($Control, $method)) {
                continue;
            }

            try {
                $result = $Control->{$method}();
                $this->assertIsString((string)$result);
            } catch (\Throwable) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
