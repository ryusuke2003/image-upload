# image-upload
画像をアップロードできるwebアプリをスモールステップで作る

フロント：　react + vite  
バックエンド：　Go(gin)  
DB: 未定  
dockerも使う予定  

1. ginを導入　一番簡易なGETメソッドを作成
2. npm create vite@latest で viteを入れる（不要なものを削除）
3. フロントからfetchしてバックエンドで作成したapi(GETメソッド)を叩く
4.