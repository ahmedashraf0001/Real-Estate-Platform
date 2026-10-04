import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('ZFNavigationDock Brand Header & User Profile Card Redesign Suite', () => {
  const cssFilePath = path.join(process.cwd(), 'src/components/admin/erp/v2/ZFWorkstationShell.module.css');
  const tsxFilePath = path.join(process.cwd(), 'src/components/admin/erp/ZFNavigationDock.tsx');
  const cssContent = fs.readFileSync(cssFilePath, 'utf8');
  const tsxContent = fs.readFileSync(tsxFilePath, 'utf8');

  describe('1. Workstation Shell CSS Invariants & Spacing Rhythm', () => {
    it('enforces 52px flush header height across all column headers', () => {
      assert.ok(
        cssContent.includes('.sidebarHeader {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  height: 52px;'),
        'sidebarHeader must have 52px height'
      );
      assert.ok(
        cssContent.includes('.sidebarCollapsed .sidebarHeader {\n  height: 52px !important;'),
        'sidebarCollapsed sidebarHeader must have 52px height'
      );
      assert.ok(
        cssContent.includes('.header {\n  height: 52px;'),
        'Top navbar .header must have 52px height'
      );
      assert.ok(
        cssContent.includes('.sideWidgetsHeader {\n  height: 52px;'),
        'sideWidgetsHeader must have 52px height'
      );
    });

    it('enforces Header -> Profile (9px), Profile -> Button (9px), Button -> Nav (12px) rhythm', () => {
      // Header -> Profile: sidebarBody top padding = 9px
      assert.ok(
        cssContent.includes('padding: 9px 0.85rem 1.35rem 0.85rem;'),
        'sidebarBody must have 9px top padding for Header -> Profile rhythm'
      );
      // Profile -> Button: profileCard margin-bottom = 9px
      assert.ok(
        cssContent.includes('margin-bottom: 9px;'),
        'profileCard must have 9px margin-bottom for Profile -> Button rhythm'
      );
      // Button -> Nav: actionBtnWrapper margin-bottom = 12px
      assert.ok(
        cssContent.includes('margin-bottom: 12px;'),
        'actionBtnWrapper must have 12px margin-bottom for Button -> Nav rhythm'
      );
    });

    it('defines brand emblem squircle container with 8px radius and hairline border', () => {
      assert.ok(cssContent.includes('.brandEmblemContainer {'), 'Must define .brandEmblemContainer');
      assert.ok(cssContent.includes('border-radius: 8px;'), 'Must have 8px squircle radius');
      assert.ok(cssContent.includes('width: 34px;'), 'Must have 34px width');
      assert.ok(cssContent.includes('height: 34px;'), 'Must have 34px height');
      assert.ok(cssContent.includes('background: #ffffff !important;'), 'Must have pure white surface');
    });

    it('defines squircle avatar with concentric 8px radius and live presence dot', () => {
      assert.ok(cssContent.includes('.profileAvatar {'), 'Must define .profileAvatar');
      assert.ok(cssContent.includes('border-radius: 8px;'), 'Avatar must be squircle with 8px radius');
      assert.ok(cssContent.includes('.profileStatusDot {'), 'Must define .profileStatusDot');
      assert.ok(
        cssContent.includes('inset-inline-end: -2px;'),
        'Status dot must use RTL logical property inset-inline-end'
      );
    });

    it('defines neutral profile card without accent tinting and neutral role badge', () => {
      assert.ok(cssContent.includes('.profileRoleBadge {'), 'Must define .profileRoleBadge');
      assert.ok(cssContent.includes('.profileCardCollapsed {'), 'Must define .profileCardCollapsed');
      assert.ok(cssContent.includes('.profileAvatarSmall {'), 'Must define .profileAvatarSmall');
      assert.ok(cssContent.includes('.profileStatusDotSmall {'), 'Must define .profileStatusDotSmall');
    });

    it('applies scale(0.96) tactile press feedback on collapse button per Better-UI rules', () => {
      assert.ok(
        cssContent.includes('.collapseBtn:active {\n  transform: scale(0.96);'),
        'collapseBtn must scale to 0.96 on active press'
      );
    });
  });

  describe('2. ZFNavigationDock TSX Source & Structural Anatomy', () => {
    it('implements brand emblem container and ERP system badge in header', () => {
      assert.ok(tsxContent.includes('styles.brandEmblemContainer'), 'Must wrap emblem in brandEmblemContainer');
      assert.ok(tsxContent.includes('styles.brandTitleRow'), 'Must include brandTitleRow');
      assert.ok(tsxContent.includes('styles.brandTitleText'), 'Must include brandTitleText');
      assert.ok(tsxContent.includes('styles.brandSystemBadge'), 'Must include brandSystemBadge');
      assert.ok(tsxContent.includes('styles.brandTaglineText'), 'Must include brandTaglineText');
    });

    it('implements squircle avatar wrap with live status dot and owner badge', () => {
      assert.ok(tsxContent.includes('styles.profileCard'), 'Must render profileCard');
      assert.ok(tsxContent.includes('styles.profileMain'), 'Must render profileMain');
      assert.ok(tsxContent.includes('styles.profileAvatarWrap'), 'Must render profileAvatarWrap');
      assert.ok(tsxContent.includes('styles.profileAvatar'), 'Must render profileAvatar');
      assert.ok(tsxContent.includes('styles.profileStatusDot'), 'Must render profileStatusDot');
      assert.ok(tsxContent.includes('styles.profileRoleBadge'), 'Must render profileRoleBadge');
    });

    it('implements collapsed profile squircle avatar with mini presence dot', () => {
      assert.ok(tsxContent.includes('styles.profileCardCollapsed'), 'Must render profileCardCollapsed');
      assert.ok(tsxContent.includes('styles.profileAvatarSmallWrap'), 'Must render profileAvatarSmallWrap');
      assert.ok(tsxContent.includes('styles.profileAvatarSmall'), 'Must render profileAvatarSmall');
      assert.ok(tsxContent.includes('styles.profileStatusDotSmall'), 'Must render profileStatusDotSmall');
    });

    it('supports customizable operator props while providing authoritative defaults', () => {
      assert.ok(tsxContent.includes('userName?: string;'), 'Must define optional userName prop');
      assert.ok(tsxContent.includes('userRole?: string;'), 'Must define optional userRole prop');
      assert.ok(tsxContent.includes('userInitials?: string;'), 'Must define optional userInitials prop');
      assert.ok(tsxContent.includes("isAr ? 'فريد زكريا' : 'Farid Zakaria'"), 'Must default to Farid Zakaria');
      assert.ok(tsxContent.includes("isAr ? 'المطور العقاري' : 'Real Estate Developer'"), 'Must default to Real Estate Developer');
      assert.ok(tsxContent.includes("isAr ? 'ف.ز' : 'FZ'"), 'Must default to initials FZ / ف.ز');
    });
  });
});
