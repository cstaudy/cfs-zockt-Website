# GitHub Initial Push Plan

Repository: `cstaudy/cfs-zockt-Website`

```bash
npm run github21:check
git init -b main
git remote add origin https://github.com/cstaudy/cfs-zockt-Website.git
git add .
git status --short
git commit -m "Initial cfs_zockt Creator Suite release candidate"
git push -u origin main
```

Nach dem Push zuerst den Quality Gate ausführen. Danach den manuellen Lockfile-Workflow starten und die erzeugten Lockfiles committen.
