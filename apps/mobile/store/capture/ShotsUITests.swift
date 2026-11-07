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

  // MARK: - Helpers

  private func signInIfNeeded() {
    let existing = app.buttons["I already have an account"]
    guard existing.waitForExistence(timeout: 6) else { return }
    existing.tap()
    let email = app.textFields.firstMatch
    XCTAssertTrue(email.waitForExistence(timeout: 5))
    email.tap()
    email.typeText(env["SHOTS_EMAIL"] ?? "")
    let password = app.secureTextFields.firstMatch
    password.tap()
    password.typeText(env["SHOTS_PASSWORD"] ?? "")
    app.buttons["Sign in"].firstMatch.tap()
    // iOS may offer to save the password, or ask about notifications, the first
    // time: decline whatever comes up until the tabs show.
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let deadline = Date().addingTimeInterval(40)
    while Date() < deadline && !(app.tabBars.firstMatch.exists || app.buttons["Learn"].exists) {
      for label in ["Not Now", "Don't Allow", "Not now"] {
        if app.buttons[label].exists { app.buttons[label].tap() }
        if springboard.buttons[label].exists { springboard.buttons[label].tap() }
      }
      settle(1)
    }
    XCTAssertTrue(app.tabBars.firstMatch.exists || app.buttons["Learn"].exists, "Signed in")
    settle(3)
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
