// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { readPersonal, savePersonal } from './personal.js';

describe('personal notes', () => {
  beforeEach(() => localStorage.clear());

  it('saves a status and note only in this browser', () => {
    savePersonal({ 'IL-ESA26-0001': { status: 'interested', note: 'เดินทางสะดวก' } });
    expect(readPersonal()).toEqual({ 'IL-ESA26-0001': { status: 'interested', note: 'เดินทางสะดวก' } });
    expect(localStorage.getItem('job-atlas-personal-v1')).toContain('เดินทางสะดวก');
  });

  it('recovers from malformed browser data', () => {
    localStorage.setItem('job-atlas-personal-v1', '{broken');
    expect(readPersonal()).toEqual({});
  });
});
