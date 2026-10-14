import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_CONTENT_DEFAULTS } from '../../siteContent/defaults';
import { previewRoute, installSettingsPreview, blockPreviewInteraction } from '../../siteContent/preview';

function harness(search = '?preview=1', framed = true) {
  const events = new EventTarget();
  let listeners = 0;
  const parent = { postMessage() {} };
  const view = { location: { search, origin: 'https://preview.invalid' }, parent,
    addEventListener: (...args: Parameters<EventTarget['addEventListener']>) => { listeners++; events.addEventListener(...args); },
    removeEventListener: (...args: Parameters<EventTarget['removeEventListener']>) => { listeners--; events.removeEventListener(...args); } };
  if (!framed) view.parent = view as unknown as typeof parent;
  const send = (data: unknown, origin = view.location.origin, source: unknown = parent) => {
    const event = new Event('message');
    Object.assign(event, { data, origin, source }); events.dispatchEvent(event);
  };
  return { view: view as unknown as Window, send, listenerCount: () => listeners };
}
const payload = () => ({ type: 'settings-preview-draft', draft: structuredClone(SITE_CONTENT_DEFAULTS), theme: 'light', target: 'hero', focusedPath: [] });
test('preview routes follow group, locale and detail target', () => {
  for (const locale of ['ar', 'en']) {
    for (const [group, suffix] of [['home',''],['about','/about'],['contact','/contact'],['listings','/properties'],['radar','/properties']] as const)
      assert.equal(previewRoute(group, locale, 'hero'), `/${locale}${suffix}?preview=1`);
    assert.equal(previewRoute('listings', locale, 'plans', 'first-slug'), `/${locale}/properties/first-slug?preview=1`);
    assert.equal(previewRoute('whatsapp', locale, 'whatsapp'), null);
  }
});
test('message guards reject wrong origin/source, unframed, malformed envelope; cleanup detaches', () => {
  const h = harness(); const received: unknown[] = [];
  const dispose = installSettingsPreview(h.view, value => received.push(value));
  h.send(payload(), 'https://evil.invalid'); h.send(payload(), undefined, {});
  h.send({ ...payload(), draft: {} }); h.send({ ...payload(), draft: null }); h.send({ ...payload(), theme: 'bogus' });
  assert.equal(received.length, 0);
  h.send(payload()); assert.equal(received.length, 1);
  dispose(); h.send(payload()); assert.equal(received.length, 1); assert.equal(h.listenerCount(), 0);
  for (const h of [harness('', true), harness('?preview=1', false)]) {
    installSettingsPreview(h.view, value => received.push(value)); h.send(payload());
    assert.equal(h.listenerCount(), 0);
  }
  assert.equal(received.length, 1);
});
test('preview blocks link clicks, auxiliary clicks and form submissions before handlers', () => {
  for (const type of ['click', 'auxclick', 'submit']) {
    const target = new EventTarget(); let navigationsOrWrites = 0;
    target.addEventListener(type, blockPreviewInteraction);
    target.addEventListener(type, () => { navigationsOrWrites++; });
    const event = new Event(type, { cancelable: true });
    assert.equal(target.dispatchEvent(event), false);
    assert.equal(event.defaultPrevented, true);
    assert.equal(navigationsOrWrites, 0);
  }
});
test('draft replaces settings and About, schema merges malformed fields to defaults, strips secrets', () => {
  const h = harness(); let result: any;
  installSettingsPreview(h.view, value => { result = value; });
  const data = payload(); data.draft.platform_settings.contact.phone = 'draft phone'; data.draft.about_page.heroTitle1En = 'draft About';
  (data.draft.platform_settings as any).hidePropertyPrices = 'bad';
  data.draft.platform_settings.whatsappAutomation!.metaAccessToken = 'secret';
  h.send(data);
  assert.equal(result.draft.platform_settings.contact.phone, 'draft phone');
  assert.equal(result.draft.about_page.heroTitle1En, 'draft About');
  assert.equal(result.draft.platform_settings.hidePropertyPrices, SITE_CONTENT_DEFAULTS.platform_settings.hidePropertyPrices);
  assert.equal(result.draft.platform_settings.whatsappAutomation.metaAccessToken, '');
});
