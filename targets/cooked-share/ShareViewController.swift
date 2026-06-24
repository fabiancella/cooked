import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let appGroupIdentifier = "group.com.fcella.cooked"
  private let pendingImportKey = "pendingSharedImport"
  private let previewLabel = UILabel()
  private var contentStack: UIStackView?
  private var sharedText: String?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    log("extension launched")
    findSharedText { [weak self] sharedText in
      self?.sharedText = sharedText
      self?.showImportView(sharedText: sharedText)
    }
  }

  private func findSharedText(completion: @escaping (String?) -> Void) {
    let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] ?? []
    let itemProviders = extensionItems.flatMap { $0.attachments ?? [] }

    let urlType = UTType.url.identifier
    let plainTextType = UTType.plainText.identifier

    loadFirstItem(from: itemProviders, typeIdentifier: urlType) { urlItem in
      if let url = urlItem as? URL {
        self.log("shared item extracted")
        completion(url.absoluteString)
        return
      }

      if let text = urlItem as? String, !text.isEmpty {
        self.log("shared item extracted")
        completion(text)
        return
      }

      self.loadFirstItem(from: itemProviders, typeIdentifier: plainTextType) { textItem in
        if let text = textItem as? String, !text.isEmpty {
          self.log("shared item extracted")
          completion(text)
          return
        }

        self.log("no shared item extracted")
        completion(nil)
      }
    }
  }

  private func loadFirstItem(
    from itemProviders: [NSItemProvider],
    typeIdentifier: String,
    completion: @escaping (NSSecureCoding?) -> Void
  ) {
    guard let itemProvider = itemProviders.first(where: { $0.hasItemConformingToTypeIdentifier(typeIdentifier) }) else {
      completion(nil)
      return
    }

    itemProvider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { item, error in
      DispatchQueue.main.async {
        if let error {
          self.log("error loading shared item: \(error.localizedDescription)")
        }

        completion(item)
      }
    }
  }

  private func showImportView(sharedText: String?) {
    contentStack?.removeFromSuperview()

    let titleLabel = UILabel()
    titleLabel.text = "Import to Cooked?"
    titleLabel.font = .preferredFont(forTextStyle: .title2)
    titleLabel.adjustsFontForContentSizeCategory = true
    titleLabel.textAlignment = .center
    titleLabel.numberOfLines = 0

    previewLabel.text = sharedText?.isEmpty == false ? sharedText : "No URL or text found."
    previewLabel.font = .preferredFont(forTextStyle: .body)
    previewLabel.adjustsFontForContentSizeCategory = true
    previewLabel.textColor = .secondaryLabel
    previewLabel.numberOfLines = 5
    previewLabel.lineBreakMode = .byTruncatingTail

    let importButton = UIButton(type: .system)
    importButton.setTitle("Import", for: .normal)
    importButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    importButton.addTarget(self, action: #selector(importTapped), for: .touchUpInside)

    let cancelButton = UIButton(type: .system)
    cancelButton.setTitle("Cancel", for: .normal)
    cancelButton.titleLabel?.font = .preferredFont(forTextStyle: .body)
    cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

    let buttonStack = UIStackView(arrangedSubviews: [importButton, cancelButton])
    buttonStack.axis = .horizontal
    buttonStack.distribution = .fillEqually
    buttonStack.spacing = 12

    let contentStack = UIStackView(arrangedSubviews: [titleLabel, previewLabel, buttonStack])
    contentStack.translatesAutoresizingMaskIntoConstraints = false
    contentStack.axis = .vertical
    contentStack.spacing = 20
    contentStack.alignment = .fill

    view.addSubview(contentStack)
    self.contentStack = contentStack

    NSLayoutConstraint.activate([
      contentStack.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor),
      contentStack.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor),
      contentStack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])

    log("UI displayed")
  }

  @objc private func importTapped() {
    log("Import tapped")

    guard let sharedText, !sharedText.isEmpty else {
      log("no shared text to save")
      showSuccessView(message: "Nothing to import.")
      return
    }

    guard let appGroupDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      log("App Group UserDefaults failed")
      showSuccessView(message: "Could not save to Cooked.")
      return
    }

    log("App Group UserDefaults opened successfully")
    appGroupDefaults.set(sharedText, forKey: pendingImportKey)

    if appGroupDefaults.synchronize() {
      log("pending import saved")
    } else {
      log("pending import save sync returned false")
    }

    log("saved value preview: \(sharedText)")
    showSuccessView(message: "Saved to Cooked. Open Cooked to finish.")
  }

  @objc private func cancelTapped() {
    log("Cancel tapped")
    finish()
  }

  private func showSuccessView(message: String) {
    contentStack?.removeFromSuperview()

    let successLabel = UILabel()
    successLabel.text = message
    successLabel.font = .preferredFont(forTextStyle: .headline)
    successLabel.adjustsFontForContentSizeCategory = true
    successLabel.textAlignment = .center
    successLabel.numberOfLines = 0

    let contentStack = UIStackView(arrangedSubviews: [successLabel])
    contentStack.translatesAutoresizingMaskIntoConstraints = false
    contentStack.axis = .vertical
    contentStack.alignment = .fill

    view.addSubview(contentStack)
    self.contentStack = contentStack

    NSLayoutConstraint.activate([
      contentStack.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor),
      contentStack.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor),
      contentStack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])

    log("success UI displayed")

    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
      self?.finish()
    }
  }

  private func finish() {
    log("completeRequest called")
    extensionContext?.completeRequest(returningItems: nil)
  }

  private func log(_ message: String) {
    NSLog("[CookedShare] %@", message)
  }
}
