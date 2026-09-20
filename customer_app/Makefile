IOS_DEVICE=62EF9065-23D7-4BD1-A8AA-317CCB8288F1

ios:
	@xcrun simctl boot $(IOS_DEVICE) 2>/dev/null || true
	@open -a Simulator
	@xcrun simctl bootstatus $(IOS_DEVICE) -b
	@flutter run -d $(IOS_DEVICE)

devices:
	@flutter devices

clean:
	@flutter clean
	@flutter pub get