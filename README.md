# AccrateDevDrive Framework

このリポジトリはAI駆動自動推進フレームワークです。
プロジェクトをクローンして、いくつかのファイルを差し替えて、プランを与えれば開発することができます。


# 特徴

- ノウハウ蓄積
- /loop による自己推進システム
- スキルから経験の分離
- GUIテスト内蔵（オプション）


#　使い方
（なんらかのボイラープレート展開ツール）でプロジェクトをクローン
README.md を差し替え、CLAUDE.repo.md を作成、必要ならCONTRIBUTING.mdを差し替えてください。


プロジェクト固有の情報は CLAUDE.repo.md に記載してください。
開発者固有の情報は CLAUDE.local.md に記載してください

CLAUDE.repo.md はファイルメンションで展開されますし、 CLAUDE.local.md はClaude Codeによって自動で読み込まれます。

`.gitignore` は git に追跡させないファイル、`.claudeignore` は Claude Code に見せないファイルを管理します。
`.gitignore` 対象でも Claude Code はパス指定でアクセスできるため、「git 非追跡だが Claude には見せたいファイル」（`*.exp.md` 等）は `.gitignore` にだけ書きます。

# フレームワークスキル
