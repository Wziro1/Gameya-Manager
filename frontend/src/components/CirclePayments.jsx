import { useApi } from '../hooks/useApi';
import Section from './Section';
import Spinner from './Spinner';
import ErrorBox from './ErrorBox';
import MyPayments from './MyPayments';
import ReviewQueue from './ReviewQueue';
import Payouts from './Payouts';
import Ledger from './Ledger';

export default function CirclePayments({ circleId, isAdmin, onCircleChanged }) {
  const ledger = useApi(`/payments/circle/${circleId}/ledger`);
  const queue = useApi(isAdmin ? `/payments/circle/${circleId}/pending` : null);

  // Pass true when the circle itself changed (for example it was just completed)
  const refreshAll = (circleChanged = false) => {
    ledger.refresh();
    queue.refresh();
    if (circleChanged && onCircleChanged) onCircleChanged();
  };

  if (ledger.loading) {
    return (
      <Section title="Payments">
        <Spinner />
      </Section>
    );
  }
  if (ledger.error) {
    return (
      <Section title="Payments">
        <ErrorBox message={ledger.error} onRetry={ledger.reload} />
      </Section>
    );
  }

  return (
    <>
      <MyPayments data={ledger.data} onChanged={refreshAll} />
      {isAdmin && <ReviewQueue queue={queue} onChanged={refreshAll} />}
      <Payouts data={ledger.data} isAdmin={isAdmin} onChanged={refreshAll} />
      <Ledger data={ledger.data} />
    </>
  );
}