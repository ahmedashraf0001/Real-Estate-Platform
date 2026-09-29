import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  OSFolderIcon, 
  OSFolderOpenIcon, 
  OSFolderActiveIcon, 
  OSFileIcon 
} from '@/components/admin/erp/v2/common/OSFileIcons';

describe('OSFileIcons Visual Component Suite', () => {
  it('renders OSFolderIcon with correct SVG attributes and amber gradient defs', () => {
    const html = renderToStaticMarkup(React.createElement(OSFolderIcon, { size: 24, className: 'custom-folder' }));
    assert.ok(html.includes('<svg'), 'Should render an SVG root element');
    assert.ok(html.includes('width="24"'), 'Should respect size attribute');
    assert.ok(html.includes('height="24"'), 'Should respect height attribute');
    assert.ok(html.includes('class="custom-folder"'), 'Should pass className');
    assert.ok(html.includes('#f59e0b'), 'Should include amber gradient stop');
    assert.ok(html.includes('#d97706'), 'Should include dark amber gradient stop');
  });

  it('renders OSFolderOpenIcon with sheet insert inside', () => {
    const html = renderToStaticMarkup(React.createElement(OSFolderOpenIcon, { size: 20 }));
    assert.ok(html.includes('<rect'), 'Open folder should have sheet insert rect');
    assert.ok(html.includes('x="5"'), 'Sheet insert should be positioned at x=5');
  });

  it('renders OSFolderActiveIcon with vibrant blue gradient defs', () => {
    const html = renderToStaticMarkup(React.createElement(OSFolderActiveIcon, { size: 18 }));
    assert.ok(html.includes('<svg'), 'Should render SVG element');
    assert.ok(html.includes('#3b82f6'), 'Should include blue gradient stop');
    assert.ok(html.includes('#2563eb'), 'Should include accent blue gradient stop');
  });

  it('renders OSFileIcon with folded corner and data lines', () => {
    const html = renderToStaticMarkup(React.createElement(OSFileIcon, { size: 16 }));
    assert.ok(html.includes('<line'), 'Should render data lines for document');
    assert.ok(html.includes('stroke="#3b82f6"'), 'Should render colored header line');
  });
});
