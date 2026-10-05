import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkName, findBlocked } from '../src/meta/name-filter.js';

const OK = ['Ahmet', 'Ayşe Nur', 'Kemal', 'İsmail', 'Cemal_34', 'Gökhan', 'Şükrü', 'Çağla', 'Zeynep.K', 'Mert-Can', 'Samet', 'Hamza', 'Osman', 'Gotham', 'Pico', 'Ümit Can', 'Tamer', 'Bayrak', 'Ali Rıza', 'Deniz77', 'Amanda', 'Selin', 'Amina', 'Amine', 'Sikke Avcısı', 'Siklon', 'Amasya'];
const BAD = [
  'amk', 'a m k', 'a.m.k', 'AMK', 'amkkk', 'aq', 'Sik', 's1k', 's.i.k', 'siiiik', 'sikerim', '$ikerim', 'S1KT1R', 'siktir git', 'orospu', '0r0spu', 'o r o s p u', 'orsp çocu', 'piç', 'p1c', 'piçler',
  'göt', 'g0tveren', 'yarrak', 'yarak', 'amına koyim', 'amcık', 'ibne', 'İbne', 'pezevenk', 'gavat', 'kahpe', 'şerefsiz', 'Serefsiz', 'yavşak', 'kaltak', 'fahişe', 'salak', 'aptal', 'gerizekalı',
  'dangalak', 'mal', 'oç', 'o.ç', 'ananı', 'fuck', 'fvck', 'f u c k', 'shit', 'bitch', 'pussy', 'nigga', 'hitler', 'Nazi', 'Admin', 'moderator', 'Patisever', 'Patisever Destek', 'Ali31', '31', 'amına', 'am1na', 'a.m.ı.n.a', 'AMINA', 'sikke sik',
];
test('uygun adlar geçer', () => {
  for (const n of OK) assert.equal(checkName(n).ok, true, n + ': ' + checkName(n).reason);
});
test('küfür, hakaret, sahte yetkili engellenir (hileli yazımlar dahil)', () => {
  const miss = BAD.filter((n) => checkName(n).ok);
  assert.deepEqual(miss, []);
});
test('biçim kuralları', () => {
  assert.equal(checkName('ab').ok, false);
  assert.equal(checkName('a'.repeat(17)).ok, false);
  assert.equal(checkName('12345').ok, false);
  assert.equal(checkName('ali  veli').name, 'ali veli');
  assert.equal(checkName('a..b').ok, false);
  assert.equal(checkName('<script>').ok, false);
  assert.equal(checkName('aaaaaa').ok, false);
  assert.equal(checkName('ali😀').ok, false);
});
test('findBlocked sohbet için de çalışır', () => {
  assert.ok(findBlocked('ne güzel oyun amk'));
  assert.equal(findBlocked('çok güzel bir el oldu'), null);
});
