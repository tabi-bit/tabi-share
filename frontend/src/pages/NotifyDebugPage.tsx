import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/apiClient';
import { DEBUG_LOG_VERSION } from '@/lib/debugLogger';
import { detectEnv } from '@/lib/envBranding';
import { fetchFcmToken } from '@/lib/messaging';
import { getDisplayMode, isIOS, isNotificationSupported, isPWAInstalled } from '@/lib/platform';

/**
 * 通知まわりの実機デバッグページ (`/debug/notify`)。導線は HomeMenu の「デバッグ」から。
 *
 * PWA とブラウザで同じ URL を開いて出力を突き合わせる用途を想定している。ログ自体は
 * 診断ロガー ([@docs/debug_logger.md](../../../docs/debug_logger.md)) に集約されるので、
 * ここでは「今この context がどうなっているか」と「手で通知を撃つ手段」だけを持つ。
 */

/** サーバ (`_frontend_base`) が icon/badge に使う絶対 URL。非 production は stg 固定 */
const SERVER_ASSET_BASE = 'https://st.tabishare.net';

/** 旅程 URL 貼り付け / urlId 直打ちのどちらも受ける。trailing slash と query は落とす */
const extractUrlId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const segments = new URL(trimmed, window.location.origin).pathname.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : null;
  } catch {
    return null;
  }
};

type RegistrationInfo = {
  registration: ServiceWorkerRegistration;
  scope: string;
  scriptURL: string;
  states: string;
  isController: boolean;
  endpoint: string;
};

const describeStates = (registration: ServiceWorkerRegistration): string =>
  (
    [
      ['installing', registration.installing],
      ['waiting', registration.waiting],
      ['active', registration.active],
    ] as const
  )
    .filter(([, worker]) => worker != null)
    .map(([slot, worker]) => `${slot}:${worker?.state}`)
    .join(' / ');

const readEndpoint = async (registration: ServiceWorkerRegistration): Promise<string> => {
  if (!('pushManager' in registration)) return '(PushManager 非対応)';
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription?.endpoint ?? '(購読なし)';
  } catch (error) {
    return `(取得失敗: ${String(error)})`;
  }
};

const collectRegistrations = async (): Promise<RegistrationInfo[]> => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const controllerScript = navigator.serviceWorker.controller?.scriptURL ?? null;
  return Promise.all(
    registrations.map(async registration => ({
      registration,
      scope: registration.scope,
      scriptURL: registration.active?.scriptURL ?? '(active なし)',
      states: describeStates(registration),
      isController: registration.active?.scriptURL === controllerScript,
      endpoint: await readEndpoint(registration),
    }))
  );
};

const Section = ({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => (
  <details className='mb-2 rounded-lg border border-gray-200 bg-white' open={defaultOpen}>
    <summary className='cursor-pointer list-none px-3 py-2 font-bold text-12px'>
      {title}
      {hint != null && <span className='ml-2 font-normal text-10px text-gray-500'>{hint}</span>}
    </summary>
    <div className='border-gray-100 border-t px-3 py-2'>{children}</div>
  </details>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className='flex gap-2 border-gray-100 border-b py-1 last:border-b-0'>
    <span className='w-24 shrink-0 text-10px text-gray-500'>{label}</span>
    <span className='min-w-0 flex-1 break-all font-mono text-10px'>{value}</span>
  </div>
);

const CopyButton = ({ label, getText }: { label: string; getText: () => string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size='sm'
      variant='outline'
      onClick={() =>
        void navigator.clipboard.writeText(getText()).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'コピーした' : label}
    </Button>
  );
};

const NotifyDebugPage = () => {
  const [registrations, setRegistrations] = useState<RegistrationInfo[]>([]);
  const [token, setToken] = useState('(未取得)');
  const [withIcon, setWithIcon] = useState(true);
  const [absoluteAssets, setAbsoluteAssets] = useState(false);
  const [urlId, setUrlId] = useState('');
  const [serverStatus, setServerStatus] = useState('(未実行)');

  /** 「裏に回したら送信」の待機解除。離脱時に listener を残さないため ref で持つ */
  const disarmRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;
    void collectRegistrations().then(infos => {
      if (!cancelled) setRegistrations(infos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => disarmRef.current?.(), []);

  const env: [string, string][] = [
    ['環境', detectEnv()],
    ['ビルドID', DEBUG_LOG_VERSION],
    ['表示モード', getDisplayMode()],
    ['PWA', String(isPWAInstalled())],
    ['iOS', String(isIOS())],
    ['通知サポート', String(isNotificationSupported())],
    ['通知許可', typeof Notification === 'undefined' ? '(Notification なし)' : Notification.permission],
    ['オリジン', window.location.origin],
    ['制御中のSW', navigator.serviceWorker?.controller?.scriptURL ?? '(なし)'],
    ['UA', navigator.userAgent],
  ];

  const buildDump = (): string =>
    [
      ...env.map(([label, value]) => `${label}: ${value}`),
      `FCMトークン: ${token}`,
      '',
      ...registrations.flatMap(info => [
        `scope: ${info.scope}`,
        `  script: ${info.scriptURL}`,
        `  states: ${info.states}${info.isController ? ' (controller)' : ''}`,
        `  endpoint: ${info.endpoint}`,
      ]),
      '',
      `server: ${serverStatus}`,
    ].join('\n');

  const showLocal = async (info: RegistrationInfo): Promise<void> => {
    const path = new URL(info.scope).pathname;
    // サーバは icon/badge を絶対 URL で送るため、オリジンが違うと挙動が変わりうる。その差を切り出せるようにする
    const base = absoluteAssets ? SERVER_ASSET_BASE : '';
    const options: NotificationOptions & { renotify?: boolean } = {
      body: `scope=${path}\nmode=${getDisplayMode()}`,
      icon: withIcon ? `${base}/icons/notify/test.png` : undefined,
      badge: `${base}/icons/notify/badge.png`,
      tag: `debug-${path}`,
      renotify: true,
      data: { link: '/debug/notify' },
    };
    await info.registration.showNotification(`debug ${path}`, options);
  };

  /** この context の token でサーバ経路を叩く */
  const callServer = async (action: 'status' | 'subscribe' | 'unsubscribe' | 'test'): Promise<void> => {
    setServerStatus('実行中...');
    try {
      const id = extractUrlId(urlId);
      if (!id) throw new Error('旅程の URL か urlId を入力して');
      const fcmToken = await fetchFcmToken();
      if (!fcmToken) throw new Error('FCM トークンが取れない');
      setToken(fcmToken);
      const trip = await apiClient.get(`/trips/url/${id}`);
      const tripId = Number(trip.data.id);
      const headers = { 'X-FCM-Token': fcmToken };

      if (action === 'subscribe') {
        await apiClient.post(`/trips/${tripId}/subscription`, {
          fcm_token: fcmToken,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          user_agent: navigator.userAgent,
        });
      } else if (action === 'unsubscribe') {
        await apiClient.delete(`/trips/${tripId}/subscription`, { headers });
      } else if (action === 'test') {
        await apiClient.post(`/trips/${tripId}/subscription/test`, null, { headers });
      }

      const res = await apiClient.get(`/trips/${tripId}/subscription`, { headers });
      setServerStatus(`tripId=${tripId} / この token は ${res.data == null ? '未購読' : '購読済み'}`);
    } catch (error) {
      setServerStatus(`失敗: ${String(error)}`);
    }
  };

  /**
   * 「裏に回したら送信」。SW 経路 (可視クライアント 0) を狙うための仕掛け。
   *
   * タイマーで遅延させると background では throttle されて送信タイミングが読めないので、
   * hidden になった瞬間を visibilitychange で捉えて送る。判定条件そのものを trigger にするので
   * 待ち時間の見積もりが要らない。
   */
  const armBackgroundTest = (): void => {
    disarmRef.current?.();
    const onVisibilityChange = (): void => {
      if (document.visibilityState !== 'hidden') return;
      disarmRef.current?.();
      void callServer('test');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    disarmRef.current = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      disarmRef.current = null;
    };
    setServerStatus('待機中 — アプリを裏に回すと送信します');
  };

  return (
    <div className='min-h-dvh bg-teal-50/50 pb-16'>
      <div className='mx-auto max-w-2xl p-3'>
        <div className='mb-3 flex items-center justify-between'>
          <h1 className='font-bold text-16px'>通知デバッグ</h1>
          <Link className='text-12px text-gray-500 underline' to='/'>
            ホームへ
          </Link>
        </div>
        <p className='mb-3 text-10px text-gray-500'>
          受信ログは診断パネル（右下）の「ログをコピー」に出ます。SW の行と build ID がズレていれば古い SW
          が動いたままです。
        </p>

        <Section title='環境' defaultOpen>
          {env.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
          <Row label='FCMトークン' value={token} />
          <Button
            className='mt-2'
            size='sm'
            variant='outline'
            onClick={() =>
              void fetchFcmToken().then(
                t => setToken(t ?? '(null)'),
                e => setToken(`(失敗: ${String(e)})`)
              )
            }
          >
            FCM トークン取得
          </Button>
        </Section>

        <Section title='Service Worker' hint={`${registrations.length} 件`} defaultOpen>
          {registrations.map(info => (
            <div key={info.scope} className='mb-2 last:mb-0'>
              <Row
                label='スコープ'
                value={`${new URL(info.scope).pathname}${info.isController ? ' (controller)' : ''}`}
              />
              <Row label='スクリプト' value={info.scriptURL} />
              <Row label='状態' value={info.states} />
              <Row label='エンドポイント' value={info.endpoint} />
            </div>
          ))}
        </Section>

        <Section title='ローカル通知' hint='FCM を経由せず表示だけを試す'>
          <label className='mb-1 flex items-center gap-2 text-10px'>
            <input type='checkbox' checked={withIcon} onChange={e => setWithIcon(e.target.checked)} />
            icon を付ける
          </label>
          <label className='mb-2 flex items-center gap-2 text-10px'>
            <input type='checkbox' checked={absoluteAssets} onChange={e => setAbsoluteAssets(e.target.checked)} />
            画像をサーバと同じ絶対 URL ({SERVER_ASSET_BASE}) にする
          </label>
          <div className='flex flex-wrap gap-2'>
            {registrations.map(info => (
              <Button key={info.scope} size='sm' variant='outline' onClick={() => void showLocal(info)}>
                {new URL(info.scope).pathname} で出す
              </Button>
            ))}
          </div>
        </Section>

        <Section title='サーバ経路' hint='この context の token で購読 / 送信'>
          <Input
            className='mb-2 text-12px'
            placeholder='旅程の URL か urlId'
            value={urlId}
            onChange={e => setUrlId(e.target.value)}
          />
          <div className='flex flex-wrap gap-2'>
            <Button size='sm' variant='outline' onClick={() => void callServer('status')}>
              購読状態
            </Button>
            <Button size='sm' variant='outline' onClick={() => void callServer('subscribe')}>
              購読する
            </Button>
            <Button size='sm' variant='outline' onClick={() => void callServer('unsubscribe')}>
              解除する
            </Button>
            <Button size='sm' onClick={() => void callServer('test')}>
              テスト送信
            </Button>
            <Button size='sm' onClick={armBackgroundTest}>
              裏に回したら送信
            </Button>
          </div>
          <Row label='結果' value={serverStatus} />
        </Section>
      </div>

      <div className='fixed inset-x-0 bottom-0 flex justify-center gap-2 border-gray-200 border-t bg-white/90 p-2 backdrop-blur-sm'>
        <CopyButton label='全部コピー' getText={buildDump} />
        <Button size='sm' variant='outline' onClick={() => void collectRegistrations().then(setRegistrations)}>
          <RefreshCwIcon />
          再読込
        </Button>
      </div>
    </div>
  );
};

export { NotifyDebugPage };
