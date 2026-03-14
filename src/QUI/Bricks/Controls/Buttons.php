<?php

/**
 * This file contains QUI\Bricks\Controls\Buttons
 */

namespace QUI\Bricks\Controls;

use QUI;

/**
 * Class Buttons
 */
class Buttons extends QUI\Control
{
    /**
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        $this->setAttributes([
            'buttons' => false,
            'displayMode' => 'button', // button, icon-only, icon-only-rounded
        ]);

        parent::__construct($attributes);

        $this->addCSSFile(
            dirname(__FILE__) . '/Buttons.css'
        );
    }

    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();

        $displayMode = (string)$this->getAttribute('displayMode');
        $displayMode = $this->isIconOnlyMode($displayMode) ? $displayMode : 'button';

        $buttons = $this->getAttribute('buttons');
        if (is_string($buttons)) {
            $buttons = json_decode($buttons, true);
        }

        if (!is_array($buttons)) {
            $buttons = [];
        }

        $normalizedButtons = [];

        foreach ($buttons as $button) {
            if (!is_array($button)) {
                continue;
            }

            $normalized = $this->normalizeButton($button, $displayMode);
            if ($normalized === null) {
                continue;
            }

            $normalizedButtons[] = $normalized;
        }

        $Engine->assign([
            'this' => $this,
            'displayMode' => $displayMode,
            'buttons' => $normalizedButtons,
        ]);

        return $Engine->fetch(dirname(__FILE__) . '/Buttons.html');
    }

    /**
     * @param array<string, mixed> $button
     * @param string $displayMode
     * @return array<string, mixed>|null
     */
    private function normalizeButton(array $button, string $displayMode): ?array
    {
        $isDisabled = (int)($button['isDisabled'] ?? 0) === 1;
        if ($isDisabled) {
            return null;
        }

        $text = isset($button['text']) ? trim((string)$button['text']) : '';
        $identifier = $this->normalizeIdentifier((string)($button['identifier'] ?? ''));
        $iconClass = $this->normalizeIconClass((string)($button['iconClass'] ?? ''));

        if ($this->isIconOnlyMode($displayMode) && $iconClass === '') {
            return null;
        }

        $iconPosition = ($button['iconPosition'] ?? 'start') === 'end'
            ? 'end'
            : 'start';

        $btnType = $this->normalizeButtonType((string)($button['btnType'] ?? 'primary'));
        $sizeClass = $this->normalizeSizeClass((string)($button['size'] ?? 'default'));
        $customClass = $this->normalizeCustomClass((string)($button['customClass'] ?? ''));
        $displayModeClass = $this->isIconOnlyMode($displayMode) ? ' btn-icon' : '';
        $displayModeClass .= $displayMode === 'icon-only-rounded' ? ' btn-rounded' : '';
        $openBrickId = max(0, (int)($button['openBrickId'] ?? 0));
        $hasOpenBrick = $openBrickId > 0;
        $openBrickWinWidth = $hasOpenBrick
            ? $this->normalizePopupDimension($button['openBrickWinWidth'] ?? '')
            : 0;
        $openBrickWinHeight = $hasOpenBrick
            ? $this->normalizePopupDimension($button['openBrickWinHeight'] ?? '')
            : 0;

        $href = trim((string)($button['href'] ?? ''));
        $hasHref = !$hasOpenBrick && $href !== '';

        $targetBlank = (bool)($button['targetBlank'] ?? false);
        $title = trim((string)($button['title'] ?? ''));
        $ariaLabel = trim((string)($button['ariaLabel'] ?? ''));
        $disabled = (bool)($button['disabled'] ?? false);
        $fullWidth = (bool)($button['fullWidth'] ?? false);

        $onClick = $hasOpenBrick
            ? ''
            : $this->normalizeOnClick((string)($button['onClick'] ?? ''));

        return [
            'text' => $text,
            'identifier' => $identifier,
            'iconClass' => $iconClass,
            'iconPosition' => $iconPosition,
            'btnClass' => 'btn' . ($btnType !== '' ? ' btn-' . $btnType : '')
                . ($sizeClass ? ' ' . $sizeClass : '')
                . ($customClass ? ' ' . $customClass : '')
                . $displayModeClass,
            'hasOpenBrick' => $hasOpenBrick,
            'openBrickId' => $openBrickId,
            'openBrickWinWidth' => $openBrickWinWidth,
            'openBrickWinHeight' => $openBrickWinHeight,
            'hasHref' => $hasHref,
            'href' => $href,
            'target' => $hasHref && $targetBlank ? '_blank' : '',
            'rel' => $hasHref && $targetBlank ? 'noopener noreferrer' : '',
            'title' => $title,
            'ariaLabel' => $ariaLabel,
            'disabled' => $disabled,
            'fullWidth' => $fullWidth,
            'onClick' => $onClick,
            'showText' => !$this->isIconOnlyMode($displayMode),
            'showIcon' => $iconClass !== '',
        ];
    }

    private function isIconOnlyMode(string $displayMode): bool
    {
        return match ($displayMode) {
            'icon-only', 'icon-only-rounded' => true,
            default => false,
        };
    }

    private function normalizeIconClass(string $iconClass): string
    {
        $iconClass = trim($iconClass);

        if ($iconClass === '') {
            return '';
        }

        return preg_replace('/[^A-Za-z0-9 _-]/', '', $iconClass) ?? '';
    }

    private function normalizeButtonType(string $type): string
    {
        $allowed = [
            '',
            'primary',
            'primary-outline',
            'secondary',
            'secondary-outline',
            'success',
            'success-outline',
            'danger',
            'danger-outline',
            'warning',
            'warning-outline',
            'info',
            'info-outline',
            'light',
            'light-outline',
            'dark',
            'dark-outline',
            'white',
            'white-outline',
            'link',
            'link-body',
        ];

        $type = trim($type);

        if (!in_array($type, $allowed, true)) {
            return 'primary';
        }

        return $type;
    }

    private function normalizeSizeClass(string $size): string
    {
        return match (trim($size)) {
            'lg' => 'btn-lg',
            'sm' => 'btn-sm',
            default => '',
        };
    }

    private function normalizeOnClick(string $onClick): string
    {
        $onClick = trim($onClick);

        if ($onClick === '') {
            return '';
        }

        if (str_ends_with($onClick, ';')) {
            $onClick = rtrim(substr($onClick, 0, -1));
        }

        // functionName
        if (preg_match('/^[A-Za-z_$][A-Za-z0-9_$.]*$/', $onClick)) {
            return $onClick . '();';
        }

        // functionName(...)
        if (preg_match('/^([A-Za-z_$][A-Za-z0-9_$.]*)\((.*)\)$/s', $onClick, $matches)) {
            $args = trim($matches[2]);

            // prevent chained statements / inline markup-like payloads
            if (
                str_contains($args, ';') ||
                str_contains($args, '<') ||
                str_contains($args, '>') ||
                str_contains($args, '`')
            ) {
                return '';
            }

            return $matches[1] . '(' . $args . ');';
        }

        return '';
    }

    private function normalizeCustomClass(string $customClass): string
    {
        $customClass = trim($customClass);

        if ($customClass === '') {
            return '';
        }

        return preg_replace('/[^A-Za-z0-9 _-]/', '', $customClass) ?? '';
    }

    private function normalizeIdentifier(string $identifier): string
    {
        $identifier = trim($identifier);

        if ($identifier === '') {
            return '';
        }

        return preg_replace('/[^A-Za-z0-9._:-]/', '', $identifier) ?? '';
    }

    private function normalizePopupDimension(mixed $value): int
    {
        $dimension = (int)$value;

        return max(0, $dimension);
    }
}
