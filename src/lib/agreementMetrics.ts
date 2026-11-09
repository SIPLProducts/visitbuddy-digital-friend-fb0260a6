export interface AgreementLike {
  agreement_type: string | null;
  visitor_id: string;
  acknowledged?: boolean | null;
}

/** NDA and DPDP privacy-notice acknowledgements are counted separately. */
export function agreementMetrics(agreements: AgreementLike[], totalVisitors: number) {
  const ndaVisitors = new Set(agreements.filter(a => (a.agreement_type ?? 'nda') === 'nda').map(a => a.visitor_id));
  const noticeVisitors = new Set(
    agreements.filter(a => a.agreement_type === 'privacy_notice' && a.acknowledged === true).map(a => a.visitor_id),
  );
  const rate = (n: number) => (totalVisitors > 0 ? Math.round((n / totalVisitors) * 100) : 0);
  return {
    withNda: ndaVisitors.size,
    ndaComplianceRate: rate(ndaVisitors.size),
    withNotice: noticeVisitors.size,
    noticeComplianceRate: rate(noticeVisitors.size),
  };
}
