import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Box, Tooltip, useMediaQuery } from '@chakra-ui/react';
import { useTimer } from 'react-timer-hook';
import classNames from 'classnames';
import { loadPoolsAtom, unqiueAssetsAtom } from 'stores/pools';
import { useAtom, useSetAtom } from 'jotai';
import {
  selectedObligationAddressAtom,
  selectedObligationAtom,
} from 'stores/obligations';
import { loadMetadataAtom } from 'stores/metadata';
import {
  refreshCounterAtom,
  selectedRpcAtom,
  switchboardAtom,
} from 'stores/settings';
import { publicKeyAtom, rawWalletDataAtom } from 'stores/wallet';

import styles from './RefreshDataButton.module.scss';

// in seconds
const INTERVAL = 30;

const getNewExpiryTimestamp = (): Date => {
  const time = new Date();
  time.setSeconds(time.getSeconds() + INTERVAL);
  return time;
};

function RefreshDataButton(): ReactElement {
  const [on, setOn] = useState<boolean>(false);
  const loadPools = useSetAtom(loadPoolsAtom);
  const [switchboardProgram] = useAtom(switchboardAtom);
  const loadObligation = useSetAtom(selectedObligationAtom);
  const [selectedObligationAddress] = useAtom(selectedObligationAddressAtom);
  const [refreshCounter] = useAtom(refreshCounterAtom);
  const refreshWallet = useSetAtom(rawWalletDataAtom);
  const loadMetadata = useSetAtom(loadMetadataAtom);
  const [unqiueAssets] = useAtom(unqiueAssetsAtom);
  const [selectedRpc] = useAtom(selectedRpcAtom);
  const [publicKey] = useAtom(publicKeyAtom);
  const [isLargerThan800] = useMediaQuery('(min-width: 800px)');

  const loadAll = useCallback(async () => {
    if (!switchboardProgram) return;
    try {
      const reloadPromises = [];
      reloadPromises.push(loadPools());
      if (selectedObligationAddress) {
        reloadPromises.push(loadObligation(selectedObligationAddress));
      }
      if (publicKey) {
        reloadPromises.push(await refreshWallet());
      }
      await Promise.all(reloadPromises);
    } finally {
      restart(getNewExpiryTimestamp());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadPools,
    loadObligation,
    selectedObligationAddress,
    switchboardProgram,
  ]);

  const { restart, seconds } = useTimer({
    autoStart: true,
    expiryTimestamp: getNewExpiryTimestamp(),
    onExpire: () => {
      // This is called on initial page load so we don't refresh first time
      if (on) {
        loadAll();
      } else {
        setOn(true);
      }
    },
  });

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounter, selectedRpc]);

  const uniqueAssetsExist = unqiueAssets.length > 0;

  // Initial loads
  useEffect(() => {
    if (uniqueAssetsExist) {
      loadMetadata();
    }
  }, [uniqueAssetsExist, loadMetadata]);

  const radius = 12;
  const circumference = radius * 2 * Math.PI;

  const completionPercentage = ((INTERVAL - seconds) / INTERVAL) * 100;

  const offset = circumference - (completionPercentage / 100) * circumference;

  const progressColor =
    completionPercentage >= 100
      ? 'var(--chakra-colors-brandAlt)'
      : 'var(--chakra-colors-brand)';
  return (
    <Box
      display={isLargerThan800 ? undefined : 'none'}
      px={1}
      className={styles.container}
    >
      <Tooltip
        label={`Data on this page will auto-refresh in ${seconds} seconds. Click this to trigger a manual refresh.`}
      >
        <svg
          width={48}
          height={48}
          onClick={() => {
            loadAll();
            restart(getNewExpiryTimestamp(), true);
          }}
        >
          <filter id='shadow'>
            <feDropShadow
              dx='0'
              dy='0'
              stdDeviation='0.7'
              floodColor={progressColor}
            />
          </filter>

          <circle
            className={classNames(styles.progressRing)}
            stroke='var(--chakra-colors-neutral)'
            strokeWidth='3'
            fill='transparent'
            r='12'
            cx='49%'
            cy='50%'
          />
          <circle
            className={classNames(styles.progressRing, styles.glow)}
            stroke={progressColor}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeWidth='3'
            fill='transparent'
            filter='url(#shadow)'
            r='12'
            cx='49%'
            cy='50%'
          />
        </svg>
      </Tooltip>
    </Box>
  );
}

export default RefreshDataButton;
