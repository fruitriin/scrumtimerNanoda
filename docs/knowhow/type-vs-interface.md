# type vs interface — TypeScript の型宣言方針

## 結論

このプロジェクトでは **`type` を優先**する。`interface` は `extends` による継承が必要な場合のみ使用する。

## 比較

| 観点 | `type` | `interface` |
|---|---|---|
| 合併型（Union） | `type A = B \| C` ✅ | ❌ 不可 |
| 交差型（Intersection） | `type A = B & C` ✅ | `interface A extends B, C` |
| プリミティブ別名 | `type ID = string` ✅ | ❌ 不可 |
| タプル | `type Pair = [string, number]` ✅ | ❌ 不可 |
| オブジェクト型 | ✅ | ✅ |
| 宣言マージ | ❌ しない | ✅ 自動マージ |
| extends | ❌（`&` で代替） | ✅ |

## `type` を選ぶ理由

### 1. 一貫性

`type` はオブジェクト型もプリミティブもユニオンもタプルも同じキーワードで書ける。
`interface` はオブジェクト型しか定義できないので、混在すると「これは type で、あれは interface」という判断コストが生まれる。

```typescript
// ✅ 全部 type で統一
type Participant = {
  id: string
  name: string
  time: number
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

type TimerAction =
  | { kind: 'start' }
  | { kind: 'stop' }
  | { kind: 'next' }
```

### 2. Vue Composable との相性

Vue 3 の Composition API では、composable の戻り値を型定義することが多い。
`type` なら交差型やユーティリティ型とシームレスに組み合わせられる。

```typescript
type UseTimerReturn = {
  isRunning: Ref<boolean>
  currentElapsed: Ref<number>
  start: () => void
  stop: () => void
}
```

### 3. 宣言マージが起きない

`interface` は同名を複数回宣言すると自動マージされる。
これは意図しない型の拡張を引き起こすリスクがある。`type` は同名の再宣言がコンパイルエラーになるため安全。

## `interface` を使うケース

- 外部ライブラリが `interface` の `extends` を要求する場合
- クラスの `implements` で使う場合（このプロジェクトではクラスをほぼ使わない）

## 参考

- [TypeScript 公式: Type vs Interface](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- プロジェクトのコーディング規約: `CLAUDE.repo.md` の「コーディング規約」セクション
