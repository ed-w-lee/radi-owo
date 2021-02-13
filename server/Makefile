prod: prod-build prod-sync

prod-build:
	. ./.prod-env && cargo build --release

prod-sync:
	scp target/release/server radiowo:~/api/
	scp -r migrations radiowo:~/api/
