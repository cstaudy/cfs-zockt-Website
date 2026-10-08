#!/usr/bin/env python3
"""CFS Zockt: local read-only website integrity and beta audit. Python >=3.10, stdlib only."""
from __future__ import annotations
import argparse, hashlib, json, sys, zipfile
from pathlib import Path

EXPECTED_VERSION="3.20.71"
DESIGN_ARCHIVE="Streaming-Gesamtpaket-31-Designs-496-Farbvarianten-Animiert-DE.zip"
DESIGN_SHA256="ed07b455972eebb320d0210eca6729e6478ad363573213006415e70fb7381f4b"
REQUIRED=(
    "server.js", "package.json", "package-lock.json", "public/pages/admin.html",
    "public/pages/admin-creators.html", "public/pages/shop.html", "public/pages/shop-product.html",
    "public/pages/cfs-ai.html", "lib/cfs-ai-gateway.js", "lib/cfs-ai-bridge-policy.js",
    "lib/admin-finance-v32071.js", "tools/admin-finance-v32071-test.mjs",
    "tools/rc-readiness-v32071.mjs", "tools/beta-preflight-v32057.mjs",
    "public/assets/data/cfs-ai-designs-v32068.json", "admin-desktop/package.json",
    "launcher/package.json", "RC-CHECKLIST-3.20.71.md"
)


def sha256_file(path: Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda:stream.read(4*1024*1024),b""):
            h.update(block)
    return h.hexdigest()


def audit(root:Path,deep:bool=True)->dict:
    root=root.resolve()
    missing=[key for key in REQUIRED if not (root/key).is_file()]
    version=""
    try: version=json.loads((root/"package.json").read_text(encoding="utf-8"))["version"]
    except (OSError,ValueError,KeyError): pass
    archive=root/"resources/original-designs"/DESIGN_ARCHIVE
    archive_ok=archive.is_file()
    archive_sha=sha256_file(archive) if archive_ok and deep else None
    worlds=set(); variants=set(); png=0; entries=0; zip_error=None
    if archive_ok and deep:
        try:
            with zipfile.ZipFile(archive) as bundle:
                bad=bundle.testzip()
                if bad: zip_error="CRC-Fehler: "+bad
                for info in bundle.infolist():
                    if info.is_dir(): continue
                    entries+=1
                    parts=info.filename.split("/")
                    if len(parts)>=5 and parts[1]=="Designs":
                        worlds.add(parts[2]);variants.add((parts[2],parts[3]))
                    if info.filename.lower().endswith(".png"): png+=1
        except (OSError,zipfile.BadZipFile) as exc: zip_error=str(exc)
    forbidden=[]
    for path in root.rglob("*"):
        rel=path.relative_to(root)
        if path.is_dir() and path.name in {"node_modules",".venv","__pycache__",".git"}:
            forbidden.append(str(rel));continue
        if not path.is_file(): continue
        if path.name in {".env", ".env.local", ".env.local.bat"} or path.suffix.lower() in {".pyc", ".pem", ".p12", ".pfx", ".key"}:
            forbidden.append(str(rel))
        if len(rel.parts)==1 and path.suffix==".py": forbidden.append(str(rel)+" (lokales CFS-AI-Modul?)")
    checks={
        "version":version==EXPECTED_VERSION,
        "critical_files":not missing,
        "original_designs_present":archive_ok,
        "original_designs_sha256":archive_ok and (not deep or archive_sha==DESIGN_SHA256),
        "design_archive_crc":not deep or (archive_ok and zip_error is None),
        "design_worlds_31":not deep or len(worlds)==31,
        "design_color_variants_496":not deep or len(variants)==496,
        "no_forbidden_runtime_files":not forbidden,
    }
    return {
        "website_version":version, "expected_version":EXPECTED_VERSION,
        "code_package_verified":all(checks.values()),
        "beta_release_approved":False,
        "public_paid_shop_release_approved":False,
        "beta_status":"HOLD — 56 reale Tests sind separat zu belegen; dieses Tool setzt sie niemals automatisch auf PASS.",
        "paid_checkout_status":"NO-GO — kostenpflichtige Pakete nur paid_preview; Ende-zu-Ende-Zahlungen/Entitlements fehlen.",
        "checks":checks, "missing_files":missing, "forbidden_files":forbidden,
        "design_archive":{"path":str(archive.relative_to(root)),"sha256":archive_sha,"expected_sha256":DESIGN_SHA256,"entries":entries,"worlds":len(worlds),"variants":len(variants),"png":png,"error":zip_error},
        "local_cfs_ai":"Externer Windows-Dienst, NICHT Bestandteil des Website-Webroots."
    }

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fast",action="store_true",help="überspringt 360-MB-Hash und ZIP-CRC")
    parser.add_argument("--output",type=Path,help="optional JSON-Bericht schreiben")
    args=parser.parse_args()
    result=audit(Path(__file__).resolve().parents[1],not args.fast)
    output=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(output+"\n",encoding="utf-8")
    print(output)
    sys.exit(0 if result["code_package_verified"] else 1)
