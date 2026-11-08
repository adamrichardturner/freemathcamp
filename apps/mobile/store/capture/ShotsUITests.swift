import XCTest

/// Walks the installed app through the screens the App Store listing shows and
/// saves each one at the device's native resolution. Driven by capture.sh, which
/// passes (as TEST_RUNNER_ variables):
///   SHOTS_DIR       where to write <name>.png
///   SHOTS_EMAIL     the local screenshot learner (see apps/api/scripts/seed-screenshot-learner.ts)
///   SHOTS_PASSWORD
///   SHOTS_LESSON    the lesson to show, SHOTS_PRACTICE the one to practise (lesson titles: one on the course map, one in Today's plan)
final class ShotsUITests: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "com.freemathcamp.app")
  var env: [String: String] { ProcessInfo.processInfo.environment }

  override func setUp() {
    continueAfterFailure = false
    app.launch()
    signInIfNeeded()
  }

  func testLearn() { tab("Learn"); settle(); shot("learn") }

  func testCourse() { tab("Course"); settle(); shot("course") }

  func testLeagues() { tab("Leagues"); settle(); shot("leagues") }

  func testProgress() { tab("Progress"); settle(); shot("progress") }

  func testLesson() {
    // From the course map, as a learner browsing would.
    tab("Course")
    settle(2)
    let title = env["SHOTS_LESSON"] ?? "Equivalent Fractions"
    let row = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
    for _ in 0..<30 where !(row.exists && row.isHittable) { app.swipeUp(velocity: .slow) }
    row.tap()
    settle(6)
    // The top of the lesson: its title, the idea in a sentence and the first visual.
    shot("lesson")
  }

  func testPractice() {
    // A card in Today's plan starts its practice straight away.
    tab("Learn")
    settle(2)
    let title = env["SHOTS_PRACTICE"] ?? "Fractions, Decimals & Percents"
    // Each card reads as one element whose label includes the lesson's title.
    let card = app.otherElements.matching(NSPredicate(format: "label CONTAINS %@", ", \(title),")).firstMatch
    for _ in 0..<10 where !(card.exists && card.isHittable) { app.swipeUp(velocity: .slow) }
    card.tap()
    settle(5)
    // Put the keyboard away so the problem has the screen: a tap on empty space
    // below the problem does it (the scroll view keeps taps only for controls).
    if app.keyboards.count > 0 {
      app.windows.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.42)).tap()
    }
    settle(2)
    shot("practice")
  }

  func testWelcome() {
    // The welcome tour's first step, where a new learner picks Path or Audit mode.
    tab("Settings")
    settle(2)
    let replay = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Replay the welcome tour")).firstMatch
    for _ in 0..<12 where !(replay.exists && replay.isHittable) { app.swipeUp(velocity: .slow) }
    replay.tap()
    settle(3)
    shot("welcome")
  }

  /// Not a store screen: walks a first-time learner through the welcome tour and
  /// checks it shows once. Runs only with SHOTS_TOUR=1, after clearing the
  /// learner's onboarded_at (it saves tour-*.png along the way).
  func testTour() throws {
    try XCTSkipUnless(env["SHOTS_TOUR"] == "1", "Set SHOTS_TOUR=1 to walk the welcome tour")
    XCTAssertTrue(app.staticTexts["Choose your path"].waitForExistence(timeout: 15), "The tour opens on the mode choice")
    settle(2)
    shot("tour-1")
    let audit = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Audit mode")).firstMatch
    XCTAssertTrue(audit.exists, "Audit mode is offered")
    audit.tap()
    settle(3)
    shot("tour-1-audit")
    let path = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Path mode")).firstMatch
    path.tap()
    settle(3)
    press("Next")
    settle(2)
    shot("tour-2")
    press("Next")
    settle(2)
    shot("tour-3")
    press("Start learning")
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    for _ in 0..<6 {
      settle(1)
      for label in ["Don't Allow", "Allow"] where springboard.buttons[label].exists { springboard.buttons[label].tap() }
    }
    settle(4)
    XCTAssertFalse(app.staticTexts["Let the plan guide you"].exists, "The tour closes")
    XCTAssertFalse(app.staticTexts["Choose your path"].exists, "The tour doesn't open a second time")
    shot("tour-done")
    app.terminate()
    app.launch()
    settle(8)
    XCTAssertFalse(app.staticTexts["Choose your path"].exists, "Nor after a relaunch")
  }

  // MARK: - Helpers

  private func signInIfNeeded() {
    let existing = app.buttons["I already have an account"]
    guard existing.waitForExistence(timeout: 6) else { return }
    existing.tap()
    let email = app.textFields.firstMatch
    XCTAssertTrue(email.waitForExistence(timeout: 5))
    // The Duo simulator's keyboard sometimes misses the first keystrokes: retype until it sticks.
    let address = env["SHOTS_EMAIL"] ?? ""
    for _ in 0..<4 where (email.value as? String) != address {
      email.tap()
      settle(1)
      let current = (email.value as? String) ?? ""
      if !current.isEmpty { email.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 2)) }
      email.typeText(address)
    }
    let password = app.secureTextFields.firstMatch
    password.tap()
    password.typeText(env["SHOTS_PASSWORD"] ?? "")
    app.buttons["Sign in"].firstMatch.tap()
    // iOS may offer to save the password, or ask about notifications, the first
    // time: decline whatever comes up until the tabs show.
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let deadline = Date().addingTimeInterval(40)
    while Date() < deadline && !(app.tabBars.firstMatch.exists || app.buttons["Learn"].exists || app.staticTexts["Choose your path"].exists) {
      for label in ["Not Now", "Don't Allow", "Not now"] {
        if app.buttons[label].exists { app.buttons[label].tap() }
        if springboard.buttons[label].exists { springboard.buttons[label].tap() }
      }
      settle(1)
    }
    XCTAssertTrue(app.tabBars.firstMatch.exists || app.buttons["Learn"].exists || app.staticTexts["Choose your path"].exists, "Signed in")
    settle(3)
  }

  /// Taps the first element whose label starts with `label` (a button's label may carry its icon's too).
  private func press(_ label: String) {
    let el = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", label)).firstMatch
    XCTAssertTrue(el.waitForExistence(timeout: 5), "\(label) is there")
    el.tap()
  }

  private func tab(_ name: String) {
    let bar = app.tabBars.buttons[name]
    if bar.waitForExistence(timeout: 8) { bar.tap() } else { app.buttons[name].firstMatch.tap() }
    // Back to the top of the tab, in case an earlier run left it scrolled.
    if bar.exists { bar.tap() }
  }

  private func settle(_ seconds: TimeInterval = 3) {
    _ = XCTWaiter.wait(for: [XCTestExpectation(description: "settle")], timeout: seconds)
  }

  private func shot(_ name: String) {
    let dir = env["SHOTS_DIR"] ?? NSTemporaryDirectory()
    let png = XCUIScreen.main.screenshot().pngRepresentation
    let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name).png")
    try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
    XCTAssertNoThrow(try png.write(to: url))
  }
}
