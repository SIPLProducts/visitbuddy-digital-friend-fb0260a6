import { describe, it, expect } from 'vitest';
import { agreementMetrics } from './agreementMetrics';

describe('agreementMetrics', () => {
  it('does not count privacy notice acknowledgements as NDAs', () => {
    const m = agreementMetrics([
      { agreement_type: 'nda', visitor_id: 'a' },
      { agreement_type: 'privacy_notice', visitor_id: 'b', acknowledged: true },
      { agreement_type: 'privacy_notice', visitor_id: 'c', acknowledged: true },
    ], 4);
    expect(m.withNda).toBe(1);
    expect(m.ndaComplianceRate).toBe(25);
    expect(m.withNotice).toBe(2);
    expect(m.noticeComplianceRate).toBe(50);
  });

  it('only counts notices that were explicitly acknowledged', () => {
    const m = agreementMetrics([{ agreement_type: 'privacy_notice', visitor_id: 'b', acknowledged: null }], 1);
    expect(m.withNotice).toBe(0);
  });
});
