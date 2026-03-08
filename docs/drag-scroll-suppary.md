# ドラッグ時スクロール問題 最終まとめ

## 問題の概要

FullCalendarベースの旅程編集画面で、イベントドラッグ・新規イベント選択時にスクロール関連の不具合が発生。PC・Androidで異なる症状が出る。

## 前提: アーキテクチャ

- FullCalendarは`height='auto'`で全高展開し、内部スクロールは無効化（`.fc-scroller-harness { overflow: visible !important }`）
- ページスクロールは外部コンテナ（TripPage.tsx の `overflow-auto h-dvh` div）が担当
- `useDragAutoScroll`フックが外部コンテナのスクロールロック＋画面端での自動スクロールを制御

---

## 不具合の発生条件と原因

### 不具合1: Androidでドラッグ中にスクロールが引きずられる（ひっつき）

| 項目 | 内容 |
| --- | --- |
| **発生条件** | Androidでイベントをドラッグ中、または新規イベント選択中 |
| **症状** | タッチスクロールがドラッグ操作に干渉し、画面がひっつくようにスクロールされる |
| **原因** | コンポジタースレッドがタッチスクロールを処理するため、JSメインスレッドでの`scrollTop`リセット（lockedScrollTopRef方式）が効かない。また`touchmove cancelable:false`のためFullCalendar内部の`preventDefault()`も無効 |

### 不具合2: PCでoverflow:hidden適用時にカーソルがズレる

| 項目 | 内容 |
| --- | --- |
| **発生条件** | PCでイベントを画面端までドラッグ、または新規イベント選択で画面外までドラッグした場合 |
| **症状** | マウスカーソルの位置とドラッグ中の要素位置がズレていく |
| **原因** | `overflow: hidden`設定時にスクロールバー（13px）が消失しレイアウトシフトが発生。これがFullCalendar内部の座標計算を狂わせる。画面内のみのドラッグではautoScrollが発火せずズレない |

### 不具合3: Android新規イベント選択時にstartDragが呼ばれない

| 項目 | 内容 |
| --- | --- |
| **発生条件** | Androidで空きスロットを長押し→ドラッグで新規イベント範囲を選択する際 |
| **症状** | スクロールロックが一切適用されず、通常のタッチスクロールがそのまま発生 |
| **原因** | (1) EditTripLayout useEffectは`e.pointerType === 'touch'`で早期リターンするためstartDragを呼ばない (2) FullCalendarの`select`コールバックは選択完了時のみ発火し、選択開始時のコールバックがない |

---

## PCとAndroidの動作の違い

### スクロールロック方式の互換性

| 方式 | PC | Android |
| --- | --- | --- |
| **lockedScrollTopRef**（scrollイベントでscrollTopリセット） | OK — JSでのscrollTopリセットが正常に機能 | NG — コンポジタースレッドがタッチスクロールを処理するためリセットが効かない |
| **overflow:hidden**（CSSでスクロール無効化） | NG — スクロールバー消失（13px）によるレイアウトシフトでカーソルズレ発生 | OK — モバイルはスクロールバー幅0のためレイアウトシフトなし |

### イベント発火の違い

| イベント | PC | Android |
| --- | --- | --- |
| `pointerdown` | マウスクリックで即座に発火 | タッチで発火するが、そのまま使うと通常スクロールもロックされてしまう |
| `pointercancel` | 発生しない | FullCalendarドラッグ中に発火し、stopDragが早期に呼ばれる問題あり |
| `touchmove cancelable` | — | `cancelable: false`のためpreventDefaultが効かない（Intervention警告） |
| FullCalendar `eventDragStart` | pointerdown後すぐ | 長押し（300ms）後に発火 |

### touch-action CSSの影響

- PC: touch-actionの設定は影響なし（マウス操作）
- Android: `.fc-event { touch-action: pan-y }`で縦スクロールを許可しつつ横ジェスチャーをブロック。`touch-action: none`にするとイベント上のスクロールが完全に不可能になる

---

## 補足: なぜAndroidでscrollTopリセットが効かないのか（ブラウザスレッドモデル）

### ブラウザのマルチスレッドアーキテクチャ

ブラウザにはスクロールに関与する2つのスレッドがある。

**メインスレッド（JSスレッド）**
- JavaScript実行、DOM操作、イベントハンドラの処理を担当
- `scrollTop`の読み書き、`scroll`イベントの発火もここ
- シングルスレッドで逐次処理

**コンポジタースレッド**
- メインスレッドとは**独立して動作**
- あらかじめペイントされたレイヤーを合成・移動するだけ
- DOM再計算やJS実行を一切行わず、60fpsを安定して維持できる

### 方式A: scrollTopリセット（lockedScrollTopRef方式）の概念実装

```ts
// ドラッグ開始時にスクロール位置を記録し、scrollイベントで強制的に戻す方式
const lockedScrollTopRef = useRef<number | null>(null);

const startDrag = () => {
  // 現在のスクロール位置を記録
  lockedScrollTopRef.current = container.scrollTop; // 例: 500px

  const onScroll = () => {
    if (lockedScrollTopRef.current !== null) {
      // ユーザーがスクロールしても、記録した位置に強制的に戻す
      container.scrollTop = lockedScrollTopRef.current;
    }
  };
  container.addEventListener('scroll', onScroll);
};
```

### 方式B: overflow:hidden方式の概念実装

```ts
// CSSでスクロール自体を不可能にする方式
const startDrag = () => {
  // スクロール不可にする（スクロールバーが消える）
  container.style.overflow = 'hidden';
};

const stopDrag = () => {
  // スクロール可能に戻す
  container.style.overflow = 'auto';
};
```

### PCマウスホイールの場合: メインスレッド経由 → 方式Aが効く

```
マウスホイール回転
  ▼
メインスレッド
  ├── wheel イベント発火
  ├── scroll イベント発火
  │     └── handler: container.scrollTop = lockedValue  ← リセット成功
  ├── スタイル再計算・レイアウト・ペイント
  └── コンポジタースレッドへ（リセット後の状態で合成・描画）
```

マウスホイールによるスクロールはメインスレッドが`scroll`イベントを処理してからコンポジタースレッドに渡す。JS側で`scrollTop`を上書きすると、**上書き後の値**が画面に反映される。

### Androidタッチスクロールの場合: コンポジタースレッドが主導 → 方式Aが効かない

```
touchstart (passive: true がデフォルト)
  ▼
ブラウザ: 「passiveリスナーなのでpreventDefault()は効かない」
  ▼
コンポジタースレッドにスクロール制御を委譲 ★
  ▼
指が移動 (touchmove)
  ├── コンポジタースレッド: スクロールオフセット即時更新 → GPU描画（画面に即反映）
  │     ↑ メインスレッドを経由しない
  │
  └── 非同期でメインスレッドに通知
        └── scroll イベント発火 → scrollTop = lockedValue を試行
              ↑ この時点で画面はもう動いている
                リセットしても次フレームでコンポジタースレッドが再び上書き
```

`touchstart`で`preventDefault()`が呼ばれなかった時点で、コンポジタースレッドがスクロールの主導権を握る。以降の`touchmove`によるスクロールはメインスレッドを**バイパス**して直接画面に反映される。

### 時系列で比較

**PC + 方式A（scrollTopリセット）: 効く**

```
t=0ms   ホイール入力
t=1ms   メインスレッド: wheel → scroll → scrollTop = locked ★成功
t=3ms   レイアウト・ペイント
t=16ms  コンポジタースレッド: ロック後の状態で描画
```

**Android + 方式A（scrollTopリセット）: 効かない**

```
t=0ms    タッチ開始（touchstart, passive）
t=1ms    コンポジタースレッド: スクロール制御を取得
t=5ms    指が移動 → コンポジタースレッドがスクロール ★画面即反映
t=10ms   指が移動 → コンポジタースレッドがスクロール ★画面即反映
t=16ms   メインスレッドに非同期通知 → scrollTop = locked ★試行
t=18ms   一瞬リセットされるが...
t=20ms   指が移動 → コンポジタースレッドが即上書き ★リセット無効化
```

### Passive Event Listenerの制約

理論上は`touchstart`で`preventDefault()`を呼べばコンポジタースレッドへの委譲を防げる。しかしChrome 56以降、`document`/`window`レベルの`touchstart`/`touchmove`はデフォルトで`passive: true`になっている（スクロールパフォーマンス優先のブラウザ設計判断）。

```ts
// NG: passive: true（デフォルト）ではpreventDefault()が無視される
document.addEventListener('touchstart', (e) => {
  e.preventDefault(); // ← Intervention警告が出て無視される
});

// 技術的には可能だが、スクロール性能が劣化する（janky scroll）
document.addEventListener('touchstart', (e) => {
  e.preventDefault(); // ← 効くがメインスレッドのJS実行完了まで描画が止まる
}, { passive: false });
```

調査ログに出ていたIntervention警告はこの制約の表れ:

```
[Intervention] Unable to preventDefault inside passive event listener
due to target being treated as passive.
```

### だから Android では方式B（overflow:hidden）が有効

```ts
// overflow: hidden はCSSレベルでスクロールを禁止する
container.style.overflow = 'hidden';
```

```
container.style.overflow = 'hidden' が設定された状態
  ▼
ブラウザ: レイアウトツリーでスクロール不可と認識
  ▼
コンポジタースレッド: このコンテナをスクロール対象から除外
  ▼
タッチ操作してもスクロールが発生しない（スレッドに関係なくブロック）
```

`overflow: hidden`はCSSプロパティとしてブラウザ全体（コンポジタースレッド含む）が認識する。JSの後追いリセットではなく、**スクロール自体を発生させない**ため確実に効く。

### では方式Bを全環境に使えばいいのでは？→ PCではスクロールバー消失問題

```ts
// PCで overflow: hidden にすると...
container.style.overflow = 'hidden';
// → スクロールバー（幅13px）が消える
// → コンテンツ領域が13px広がる（レイアウトシフト）
// → FullCalendarの座標計算がズレる → カーソルとドラッグ要素の位置がズレる

// Androidでは...
container.style.overflow = 'hidden';
// → モバイルブラウザのスクロールバーはオーバーレイ表示（幅0px）
// → レイアウトシフトなし → カーソルズレなし ★問題なし
```

**結論: PC=方式A、Android=方式Bのハイブリッドが必要**

```ts
const startDrag = (isTouch: boolean) => {
  if (isTouch) {
    // Android: CSSでスクロールを止める（コンポジタースレッドも従う）
    container.style.overflow = 'hidden';
  } else {
    // PC: scrollイベントでリセット（メインスレッド経由なので効く）
    lockedScrollTopRef.current = container.scrollTop;
    container.addEventListener('scroll', lockHandler);
  }
};
```

---

## 最終的な解決法: ハイブリッドアプローチ

### 方針

PCとAndroidで異なるスクロールロック方式を使い分ける。`startDrag(isTouch: boolean)`の引数で切り替え。

### useDragAutoScroll.ts — スクロール制御

| | PC (`isTouch=false`) | Android (`isTouch=true`) |
| --- | --- | --- |
| **スクロールロック** | scrollイベントハンドラで`scrollTop`をリセット | `overflow: hidden`をCSSで設定 |
| **自動スクロール** | `lockedScrollTopRef`を更新してから`scrollBy` | `scrollBy`で直接操作 |
| **レイアウトシフト** | なし（overflow変更なし） | なし（スクロールバー幅0） |
| **カーソルズレ** | なし | なし |

### EditTripLayout.tsx — ドラッグ検出

3つの経路でstartDrag/stopDragを呼び分ける:

| 経路 | 対象操作 | startDrag引数 |
| --- | --- | --- |
| **useEffect (pointer系イベント)** | PC: マウスによる新規選択・ドラッグ | `startDrag(false)` |
| **FullCalendar eventDragStart/Stop** | PC/Android: 既存イベントのドラッグ・リサイズ | `startDrag(true)` ※Android FCコールバック経由 |
| **MutationObserver (fc-highlight検知)** | Android: 新規イベント選択 | `startDrag(true)` |

### MutationObserver方式の詳細（Android新規選択の解決）

FullCalendarは新規選択時に`.fc-highlight`要素をDOMに追加する。MutationObserverでこれを検知してstartDragを呼ぶ。

ただし、FullCalendarは選択範囲変更時にハイライト要素を**入れ替え**（旧削除→新追加）し、React Queryのデータ更新でも再レンダリングで入れ替えが発生するため、単純な追加検知では誤動作する。

**解決策: `isSelectionHighlightActiveRef`による選択状態追跡**

- 追加検知 + `isSelectionHighlightActiveRef=false` → 新規選択開始 → `startDrag(true)`
- 追加検知 + `isSelectionHighlightActiveRef=true` → 入れ替え/再レンダリング → 無視
- 削除のみ検知（追加なし） → ハイライト完全消去 → フラグリセット

---

## 最終検証結果

| シナリオ | PC | Android |
| --- | --- | --- |
| イベントドラッグ（画面内） | OK | OK |
| イベントドラッグ（画面端スクロール） | OK | OK |
| 新規イベント選択（ドラッグ中） | OK | OK |
| 新規選択→ダイアログ送信後のドラッグ | OK | OK |
| 連続して複数回新規選択 | OK | OK |

全シナリオでPC・Android共に正常動作を確認。
