import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let debugImportScreenOnly = false
  private let appGroupIdentifier = "group.com.fcella.cooked"
  private let pendingImportKey = "pendingSharedImport"
  private let creamColor = UIColor(red: 1.0, green: 0.973, blue: 0.941, alpha: 1.0)
  private let herbColor = UIColor(red: 0.255, green: 0.392, blue: 0.290, alpha: 1.0)
  private let inkColor = UIColor(red: 0.165, green: 0.129, blue: 0.094, alpha: 1.0)
  private let lineColor = UIColor(red: 0.918, green: 0.863, blue: 0.796, alpha: 1.0)
  private let mutedColor = UIColor(red: 0.490, green: 0.431, blue: 0.380, alpha: 1.0)
  private let paperColor = UIColor.white
  private let sageColor = UIColor(red: 0.918, green: 0.945, blue: 0.910, alpha: 1.0)
  private let previewLabel = UILabel()
  private var contentStack: UIStackView?
  private var sharedText: String?

  override func viewDidLoad() {
    super.viewDidLoad()
    overrideUserInterfaceStyle = .light
    view.backgroundColor = creamColor

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

    let iconLabel = UILabel()
    iconLabel.text = "🍳"
    iconLabel.font = .systemFont(ofSize: 26)
    iconLabel.textAlignment = .center

    let iconView = UIView()
    iconView.backgroundColor = sageColor
    iconView.layer.cornerRadius = 26
    iconView.translatesAutoresizingMaskIntoConstraints = false
    iconView.addSubview(iconLabel)
    iconLabel.translatesAutoresizingMaskIntoConstraints = false

    NSLayoutConstraint.activate([
      iconView.widthAnchor.constraint(equalToConstant: 52),
      iconView.heightAnchor.constraint(equalToConstant: 52),
      iconLabel.centerXAnchor.constraint(equalTo: iconView.centerXAnchor),
      iconLabel.centerYAnchor.constraint(equalTo: iconView.centerYAnchor),
    ])

    let titleLabel = UILabel()
    titleLabel.text = "Import to Cooked?"
    titleLabel.font = .systemFont(ofSize: 25, weight: .bold)
    titleLabel.adjustsFontForContentSizeCategory = true
    titleLabel.textColor = inkColor
    titleLabel.textAlignment = .center
    titleLabel.numberOfLines = 0

    let subtitleLabel = UILabel()
    subtitleLabel.text = "Save this recipe link and Cooked will format it when you open the app."
    subtitleLabel.font = .preferredFont(forTextStyle: .subheadline)
    subtitleLabel.adjustsFontForContentSizeCategory = true
    subtitleLabel.textColor = mutedColor
    subtitleLabel.textAlignment = .center
    subtitleLabel.numberOfLines = 0

    let importButton = makeButton(title: "Import", backgroundColor: herbColor, titleColor: .white)
    importButton.addTarget(self, action: #selector(importTapped), for: .touchUpInside)

    let cancelButton = makeButton(title: "Cancel", backgroundColor: sageColor, titleColor: herbColor)
    cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

    let buttonStack = UIStackView(arrangedSubviews: [importButton, cancelButton])
    buttonStack.axis = .vertical
    buttonStack.distribution = .fill
    buttonStack.spacing = 12

    let headerStack = UIStackView(arrangedSubviews: [iconView, titleLabel, subtitleLabel])
    headerStack.axis = .vertical
    headerStack.spacing = 10
    headerStack.alignment = .center

    let cardView = UIView()
    cardView.translatesAutoresizingMaskIntoConstraints = false
    cardView.backgroundColor = paperColor
    cardView.layer.cornerRadius = 24
    cardView.layer.borderWidth = 1
    cardView.layer.borderColor = lineColor.cgColor
    cardView.layer.shadowColor = UIColor.black.cgColor
    cardView.layer.shadowOpacity = 0.10
    cardView.layer.shadowRadius = 18
    cardView.layer.shadowOffset = CGSize(width: 0, height: 8)

    let cardStack = UIStackView(arrangedSubviews: [headerStack, buttonStack])
    cardStack.translatesAutoresizingMaskIntoConstraints = false
    cardStack.axis = .vertical
    cardStack.spacing = 18
    cardStack.alignment = .fill

    cardView.addSubview(cardStack)

    NSLayoutConstraint.activate([
      cardStack.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 22),
      cardStack.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 20),
      cardStack.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -20),
      cardStack.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -20),
    ])

    let contentStack = UIStackView(arrangedSubviews: [cardView])
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

    log("UI displayed")
  }

  @objc private func importTapped() {
    log("Import tapped")
    showLoadingView(message: "Importing to Cooked...")

    if debugImportScreenOnly {
      log("debug import screen mode enabled; skipping save")
      showDebugImportFlow()
      return
    }

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

    let iconLabel = UILabel()
    iconLabel.text = "✓"
    iconLabel.font = .systemFont(ofSize: 28, weight: .bold)
    iconLabel.textColor = herbColor
    iconLabel.textAlignment = .center

    let iconView = UIView()
    iconView.backgroundColor = sageColor
    iconView.layer.cornerRadius = 28
    iconView.translatesAutoresizingMaskIntoConstraints = false
    iconView.addSubview(iconLabel)
    iconLabel.translatesAutoresizingMaskIntoConstraints = false

    let successLabel = UILabel()
    successLabel.text = message
    successLabel.font = .systemFont(ofSize: 19, weight: .bold)
    successLabel.adjustsFontForContentSizeCategory = true
    successLabel.textColor = inkColor
    successLabel.textAlignment = .center
    successLabel.numberOfLines = 0

    NSLayoutConstraint.activate([
      iconView.widthAnchor.constraint(equalToConstant: 56),
      iconView.heightAnchor.constraint(equalToConstant: 56),
      iconLabel.centerXAnchor.constraint(equalTo: iconView.centerXAnchor),
      iconLabel.centerYAnchor.constraint(equalTo: iconView.centerYAnchor),
    ])

    let contentStack = UIStackView(arrangedSubviews: [iconView, successLabel])
    contentStack.translatesAutoresizingMaskIntoConstraints = false
    contentStack.axis = .vertical
    contentStack.spacing = 14
    contentStack.alignment = .center

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

  private func showDebugImportFlow() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
      self?.showSuccessView(message: "Debug import complete.")
    }
  }

  private func showLoadingView(message: String) {
    contentStack?.removeFromSuperview()

    let activityIndicator = UIActivityIndicatorView(style: .large)
    activityIndicator.color = herbColor
    activityIndicator.startAnimating()

    let loadingLabel = UILabel()
    loadingLabel.text = message
    loadingLabel.font = .systemFont(ofSize: 19, weight: .bold)
    loadingLabel.adjustsFontForContentSizeCategory = true
    loadingLabel.textColor = inkColor
    loadingLabel.textAlignment = .center
    loadingLabel.numberOfLines = 0

    let helperLabel = UILabel()
    helperLabel.text = "Testing the import screen without saving anything."
    helperLabel.font = .preferredFont(forTextStyle: .subheadline)
    helperLabel.adjustsFontForContentSizeCategory = true
    helperLabel.textColor = mutedColor
    helperLabel.textAlignment = .center
    helperLabel.numberOfLines = 0

    let contentStack = UIStackView(arrangedSubviews: [activityIndicator, loadingLabel, helperLabel])
    contentStack.translatesAutoresizingMaskIntoConstraints = false
    contentStack.axis = .vertical
    contentStack.spacing = 14
    contentStack.alignment = .center

    view.addSubview(contentStack)
    self.contentStack = contentStack

    NSLayoutConstraint.activate([
      contentStack.leadingAnchor.constraint(equalTo: view.layoutMarginsGuide.leadingAnchor),
      contentStack.trailingAnchor.constraint(equalTo: view.layoutMarginsGuide.trailingAnchor),
      contentStack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])

    log("debug loading UI displayed")
  }

  private func finish() {
    log("completeRequest called")
    extensionContext?.completeRequest(returningItems: nil)
  }

  private func makeButton(title: String, backgroundColor: UIColor, titleColor: UIColor) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.setTitleColor(titleColor, for: .normal)
    button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    button.titleLabel?.adjustsFontForContentSizeCategory = true
    button.backgroundColor = backgroundColor
    button.layer.cornerRadius = 14
    button.contentEdgeInsets = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
    return button
  }

  private func log(_ message: String) {
    NSLog("[CookedShare] %@", message)
  }
}
