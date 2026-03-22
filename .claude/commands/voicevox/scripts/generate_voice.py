#!/usr/bin/env python3
"""VoiceVox Engine APIを使って音声ファイル(WAV)を生成する"""
import argparse
import json
import sys
import urllib.parse
import urllib.request


def list_speakers(base_url: str) -> None:
    """利用可能な話者一覧を表示"""
    url = f"{base_url}/speakers"
    with urllib.request.urlopen(url) as res:
        speakers = json.loads(res.read())
    for s in speakers:
        styles = ", ".join(f'{st["name"]}(id={st["id"]})' for st in s["styles"])
        print(f'{s["name"]}: {styles}')


def generate(base_url: str, text: str, speaker: int, output: str) -> None:
    """テキストからWAVファイルを生成"""
    # audio_query
    query_url = f"{base_url}/audio_query?text={urllib.parse.quote(text)}&speaker={speaker}"
    req = urllib.request.Request(query_url, method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        query_data = res.read()

    # synthesis
    synth_url = f"{base_url}/synthesis?speaker={speaker}"
    req2 = urllib.request.Request(synth_url, data=query_data, method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req2) as res2:
        wav_data = res2.read()

    with open(output, "wb") as f:
        f.write(wav_data)

    print(f"Generated: {output} ({len(wav_data)} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser(description="VoiceVox音声生成")
    parser.add_argument("--base-url", default="http://localhost:50021", help="VoiceVox Engine URL")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("list", help="話者一覧を表示")

    gen = sub.add_parser("generate", help="音声を生成")
    gen.add_argument("--text", required=True, help="読み上げテキスト")
    gen.add_argument("--speaker", type=int, default=3, help="話者ID (default: 3=ずんだもんノーマル)")
    gen.add_argument("--output", required=True, help="出力WAVファイルパス")

    args = parser.parse_args()

    if args.command == "list":
        list_speakers(args.base_url)
    elif args.command == "generate":
        generate(args.base_url, args.text, args.speaker, args.output)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
