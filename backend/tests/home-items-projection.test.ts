import { expect, test } from 'vitest';
import { capitalizeHomeItemName, countHomeItemPreparation, homeItemGroupKey, normalizeHomeItemName } from '../src/application/home-items-projection.js';

test.each([
  ['  BODY blau  ', 'body blau'], ['COTO\u0301', 'cotó'],
  ['İ', 'i\u0307'], ['𐐀', '𐐨'],
])('normalitza %s segons trim, NFC, lowercase i NFC final', (input, expected) => {
  expect(normalizeHomeItemName(input)).toBe(expected);
});

test('accents i espais interiors continuen sent significatius', () => {
  expect(normalizeHomeItemName('cotó')).not.toBe(normalizeHomeItemName('coto'));
  expect(normalizeHomeItemName('body  blau')).not.toBe(normalizeHomeItemName('body blau'));
});

test.each([
  ['body blau', 'Body blau'], ['2 bodies de cotó', '2 Bodies de cotó'],
  ['- manta suau', '- Manta suau'], ['3x pitets', '3X pitets'], ['iPhone', 'IPhone'],
  ['👶 2 ànec BLAU', '👶 2 Ànec BLAU'], ['𐐨 body', '𐐀 body'],
  ['123!?', '123!?'], ['  body ', '  Body '], ['e\u0301 body', 'E\u0301 body'],
  ['ß body', 'SS body'], ['', ''],
])('capitalitza la primera lletra Unicode de %s', (input, expected) => {
  expect(capitalizeHomeItemName(input)).toBe(expected);
});

test('claus equivalents, estables, versionades i independents de l’ordre', () => {
  expect(homeItemGroupKey(2, ' COTO\u0301 ')).toBe(homeItemGroupKey(2, 'cotó'));
  const tuples = [[2, 'body'], [3, 'body'], [2, 'body  blau'], [2, 'body blau'],
    [2, 'cotó'], [2, 'coto'], [2, 'a,"3"'], [23, 'a'], [2, '3a'], [2, '\u0000'],
    [2, '"], [3, "body'], [2, '\\'], [2, '👶']] as const;
  const keys = tuples.map(([id, name]) => homeItemGroupKey(id, name));
  expect(new Set(keys).size).toBe(tuples.length);
  expect([...tuples].reverse().map(([id, name]) => homeItemGroupKey(id, name)).reverse()).toEqual(keys);
  expect(keys.every((key) => key.startsWith('home-items:v1:'))).toBe(true);
});

test('recompta tots els estats sense mutar l’entrada', () => {
  const states = Object.freeze(['preparada', null, 'no_preparada', null, 'preparada'] as const);
  const counts = countHomeItemPreparation(states);
  expect(counts).toEqual({ prepared: 2, not_prepared: 1, unspecified: 2 });
  expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBe(states.length);
  expect(states).toEqual(['preparada', null, 'no_preparada', null, 'preparada']);
  expect(countHomeItemPreparation([])).toEqual({ prepared: 0, not_prepared: 0, unspecified: 0 });
  expect(countHomeItemPreparation([null])).toEqual({ prepared: 0, not_prepared: 0, unspecified: 1 });
  expect(countHomeItemPreparation(['preparada'])).toEqual({ prepared: 1, not_prepared: 0, unspecified: 0 });
});
