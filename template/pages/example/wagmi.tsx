import { Suspense } from 'react';

import dynamic from 'next/dynamic';

import BlockNumber from './BlockNumber';
import styles from './wagmi.module.css';

const Connect = dynamic(() => import('./Connect'), { ssr: false });
const Account = dynamic(() => import('./Account'), { ssr: false });
const NetworkSwitcher = dynamic(() => import('./NetworkSwitcher'), {
  ssr: false,
});

function Page() {
  return (
    <div className={styles.container}>
      <h1>Wagmi example</h1>
      <Suspense fallback={<div>loading...</div>}>
        <div>
          <Connect />
          <Account />
          <NetworkSwitcher />
          <BlockNumber />
        </div>
      </Suspense>
    </div>
  );
}

export default Page;
