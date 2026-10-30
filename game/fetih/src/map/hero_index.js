// Kahraman maket yapıcılarının dizini: SITES adı → yapıcı(k, R) (üreteç: `yield` ile dilim dilim kurulur).
// Yapıcısı olmayan yapı yakın çekimde yalın kalır.

import { CAMI } from './hero_cami.js';
import { ISTANBUL } from './hero_istanbul.js';
import { KALE } from './hero_kale.js';
import { ANTIK } from './hero_antik.js';
import { DOGA } from './hero_doga.js';

export const HEROES = { ...CAMI, ...ISTANBUL, ...KALE, ...ANTIK, ...DOGA };
