/**
 * Native macOS Accessibility Module for BrainDump
 *
 * This module provides Node.js bindings to macOS Accessibility APIs,
 * enabling detection of focused text fields and programmatic text injection.
 *
 * Core APIs:
 * - hasAccessibilityPermissions(): Check if app has accessibility access
 * - requestAccessibilityPermissions(): Open System Preferences for permissions
 * - getFocusedElement(): Get currently focused UI element
 * - isTextInputElement(): Check if element is a text input
 * - insertText(): Inject text at current cursor position
 * - startMonitoringActiveApp(): Monitor active application changes
 *
 * Requirements: macOS 12+ (Monterey or later)
 * Architecture: Apple Silicon and Intel
 */

#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>
#import <Carbon/Carbon.h>
#include <napi.h>

// Forward declarations for observer callbacks
static void activeApplicationChangedCallback(
    AXObserverRef observer,
    AXUIElementRef element,
    CFStringRef notification,
    void *refcon
);

// Global state for active app monitoring
static Napi::ThreadSafeFunction tsfn;
static AXObserverRef globalObserver = nullptr;
static pid_t monitoredPID = 0;

/**
 * Check if the application has accessibility permissions
 *
 * This checks the system's Accessibility database to determine if
 * the current process has permission to control the computer.
 *
 * @return Boolean - true if permissions are granted, false otherwise
 */
Napi::Value HasAccessibilityPermissions(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Check if we have accessibility permissions
    NSDictionary *options = @{(__bridge id)kAXTrustedCheckOptionPrompt: @NO};
    Boolean hasPermissions = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);

    return Napi::Boolean::New(env, hasPermissions);
}

/**
 * Request accessibility permissions from the user
 *
 * This will trigger the system dialog asking the user to grant
 * accessibility permissions. It opens System Preferences to the
 * Privacy & Security > Accessibility panel.
 *
 * @return Boolean - true if dialog was shown, false if already granted
 */
Napi::Value RequestAccessibilityPermissions(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Check current status
    NSDictionary *options = @{(__bridge id)kAXTrustedCheckOptionPrompt: @NO};
    Boolean hasPermissions = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);

    if (hasPermissions) {
        return Napi::Boolean::New(env, false);
    }

    // Request permissions (will show dialog)
    NSDictionary *promptOptions = @{(__bridge id)kAXTrustedCheckOptionPrompt: @YES};
    AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)promptOptions);

    return Napi::Boolean::New(env, true);
}

/**
 * Get information about the currently focused UI element
 *
 * Returns details about the focused element including its role,
 * value, position, and whether it's a text input field.
 *
 * @return Object with properties:
 *   - role: String (AXTextField, AXTextArea, etc.)
 *   - value: String (current text content)
 *   - isTextInput: Boolean
 *   - appName: String (name of the application)
 *   - appPID: Number (process ID)
 *   - selectedText: String (currently selected text)
 *   - selectedRange: Object {location, length}
 */
Napi::Value GetFocusedElement(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);

    // Check permissions first
    if (!AXIsProcessTrusted()) {
        Napi::TypeError::New(env, "Accessibility permissions not granted").ThrowAsJavaScriptException();
        return env.Null();
    }

    @autoreleasepool {
        // Get the frontmost application
        NSRunningApplication *frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
        if (!frontApp) {
            Napi::Error::New(env, "Could not get frontmost application").ThrowAsJavaScriptException();
            return env.Null();
        }

        pid_t pid = [frontApp processIdentifier];
        result.Set("appPID", Napi::Number::New(env, pid));
        result.Set("appName", Napi::String::New(env, [[frontApp localizedName] UTF8String]));

        // Create accessibility object for the application
        AXUIElementRef appElement = AXUIElementCreateApplication(pid);
        if (!appElement) {
            Napi::Error::New(env, "Could not create accessibility element for app").ThrowAsJavaScriptException();
            return env.Null();
        }

        // Get the focused element
        AXUIElementRef focusedElement = nullptr;
        AXError error = AXUIElementCopyAttributeValue(
            appElement,
            kAXFocusedUIElementAttribute,
            (CFTypeRef *)&focusedElement
        );

        CFRelease(appElement);

        if (error != kAXErrorSuccess || !focusedElement) {
            result.Set("focused", Napi::Boolean::New(env, false));
            return result;
        }

        result.Set("focused", Napi::Boolean::New(env, true));

        // Get the role
        CFTypeRef roleValue = nullptr;
        error = AXUIElementCopyAttributeValue(focusedElement, kAXRoleAttribute, &roleValue);
        if (error == kAXErrorSuccess && roleValue) {
            NSString *role = (__bridge NSString *)roleValue;
            result.Set("role", Napi::String::New(env, [role UTF8String]));
            CFRelease(roleValue);
        }

        // Get the value
        CFTypeRef value = nullptr;
        error = AXUIElementCopyAttributeValue(focusedElement, kAXValueAttribute, &value);
        if (error == kAXErrorSuccess && value) {
            if (CFGetTypeID(value) == CFStringGetTypeID()) {
                NSString *valueStr = (__bridge NSString *)value;
                result.Set("value", Napi::String::New(env, [valueStr UTF8String]));
            }
            CFRelease(value);
        }

        // Get selected text range
        CFTypeRef selectedRange = nullptr;
        error = AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextRangeAttribute, &selectedRange);
        if (error == kAXErrorSuccess && selectedRange) {
            CFRange range;
            if (AXValueGetValue((AXValueRef)selectedRange, (AXValueType)kAXValueCFRangeType, &range)) {
                Napi::Object rangeObj = Napi::Object::New(env);
                rangeObj.Set("location", Napi::Number::New(env, range.location));
                rangeObj.Set("length", Napi::Number::New(env, range.length));
                result.Set("selectedRange", rangeObj);
            }
            CFRelease(selectedRange);
        }

        // Get selected text
        CFTypeRef selectedText = nullptr;
        error = AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextAttribute, &selectedText);
        if (error == kAXErrorSuccess && selectedText) {
            if (CFGetTypeID(selectedText) == CFStringGetTypeID()) {
                NSString *selectedStr = (__bridge NSString *)selectedText;
                result.Set("selectedText", Napi::String::New(env, [selectedStr UTF8String]));
            }
            CFRelease(selectedText);
        }

        // Check if it's a text input element
        CFTypeRef roleDesc = nullptr;
        error = AXUIElementCopyAttributeValue(focusedElement, kAXRoleDescriptionAttribute, &roleDesc);
        bool isTextInput = false;
        if (error == kAXErrorSuccess && roleDesc) {
            NSString *roleDescStr = (__bridge NSString *)roleDesc;
            NSString *lowerDesc = [roleDescStr lowercaseString];
            isTextInput = [lowerDesc containsString:@"text"] ||
                         [lowerDesc containsString:@"field"] ||
                         [lowerDesc containsString:@"area"];
            CFRelease(roleDesc);
        }

        result.Set("isTextInput", Napi::Boolean::New(env, isTextInput));

        CFRelease(focusedElement);
    }

    return result;
}

/**
 * Check if a given element (or current focused element) is a text input
 *
 * This determines if an element can accept text input by checking its
 * accessibility role and attributes.
 *
 * @param element (optional) - Element info object from getFocusedElement()
 * @return Boolean - true if element is a text input field
 */
Napi::Value IsTextInputElement(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // If no argument provided, check the currently focused element
    if (info.Length() == 0) {
        Napi::Value focusedElement = GetFocusedElement(info);
        if (focusedElement.IsObject()) {
            Napi::Object obj = focusedElement.As<Napi::Object>();
            if (obj.Has("isTextInput")) {
                return obj.Get("isTextInput");
            }
        }
        return Napi::Boolean::New(env, false);
    }

    // Check the provided element object
    if (!info[0].IsObject()) {
        Napi::TypeError::New(env, "Argument must be an object").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object element = info[0].As<Napi::Object>();
    if (element.Has("isTextInput")) {
        return element.Get("isTextInput");
    }

    // Fallback: check role
    if (element.Has("role")) {
        std::string role = element.Get("role").As<Napi::String>().Utf8Value();
        bool isTextInput = (role.find("TextField") != std::string::npos ||
                           role.find("TextArea") != std::string::npos ||
                           role.find("ComboBox") != std::string::npos);
        return Napi::Boolean::New(env, isTextInput);
    }

    return Napi::Boolean::New(env, false);
}

/**
 * Insert text at the current cursor position
 *
 * This injects text into the currently focused text field, preserving
 * any existing text. The text is inserted at the cursor position, or
 * replaces selected text if there is a selection.
 *
 * Strategy:
 * 1. Get focused element
 * 2. Verify it's a text input
 * 3. Get current selection range
 * 4. Set new value with text inserted at cursor position
 * 5. Restore cursor position after inserted text
 *
 * @param text - String to insert
 * @param element (optional) - Element info object (uses focused if not provided)
 * @return Boolean - true if insertion succeeded, false otherwise
 */
Napi::Value InsertText(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "First argument must be a string").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string textToInsert = info[0].As<Napi::String>().Utf8Value();

    // Check permissions
    if (!AXIsProcessTrusted()) {
        Napi::Error::New(env, "Accessibility permissions not granted").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    @autoreleasepool {
        // Get the frontmost application
        NSRunningApplication *frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
        if (!frontApp) {
            return Napi::Boolean::New(env, false);
        }

        pid_t pid = [frontApp processIdentifier];
        AXUIElementRef appElement = AXUIElementCreateApplication(pid);
        if (!appElement) {
            return Napi::Boolean::New(env, false);
        }

        // Get focused element
        AXUIElementRef focusedElement = nullptr;
        AXError error = AXUIElementCopyAttributeValue(
            appElement,
            kAXFocusedUIElementAttribute,
            (CFTypeRef *)&focusedElement
        );

        CFRelease(appElement);

        if (error != kAXErrorSuccess || !focusedElement) {
            return Napi::Boolean::New(env, false);
        }

        // Get current value
        CFTypeRef currentValue = nullptr;
        error = AXUIElementCopyAttributeValue(focusedElement, kAXValueAttribute, &currentValue);

        NSString *currentText = @"";
        if (error == kAXErrorSuccess && currentValue) {
            if (CFGetTypeID(currentValue) == CFStringGetTypeID()) {
                currentText = (__bridge NSString *)currentValue;
            }
            CFRelease(currentValue);
        }

        // Get selected range
        CFTypeRef selectedRange = nullptr;
        error = AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextRangeAttribute, &selectedRange);

        CFRange range = {0, 0};
        if (error == kAXErrorSuccess && selectedRange) {
            AXValueGetValue((AXValueRef)selectedRange, (AXValueType)kAXValueCFRangeType, &range);
            CFRelease(selectedRange);
        }

        // Insert text at cursor position
        NSMutableString *newText = [NSMutableString stringWithString:currentText];
        NSString *insertString = [NSString stringWithUTF8String:textToInsert.c_str()];

        // Handle selection or cursor position
        NSRange nsRange = NSMakeRange(range.location, range.length);
        if (nsRange.location > [newText length]) {
            nsRange.location = [newText length];
        }

        [newText replaceCharactersInRange:nsRange withString:insertString];

        // Set the new value
        error = AXUIElementSetAttributeValue(
            focusedElement,
            kAXValueAttribute,
            (__bridge CFTypeRef)newText
        );

        if (error != kAXErrorSuccess) {
            CFRelease(focusedElement);
            return Napi::Boolean::New(env, false);
        }

        // Set cursor position after inserted text
        CFRange newRange = {static_cast<CFIndex>(range.location + [insertString length]), 0};
        AXValueRef newRangeValue = AXValueCreate((AXValueType)kAXValueCFRangeType, &newRange);
        if (newRangeValue) {
            AXUIElementSetAttributeValue(
                focusedElement,
                kAXSelectedTextRangeAttribute,
                newRangeValue
            );
            CFRelease(newRangeValue);
        }

        CFRelease(focusedElement);
    }

    return Napi::Boolean::New(env, true);
}

/**
 * Callback for active application change notifications
 */
static void activeApplicationChangedCallback(
    AXObserverRef observer,
    AXUIElementRef element,
    CFStringRef notification,
    void *refcon
) {
    @autoreleasepool {
        NSRunningApplication *frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
        if (!frontApp) return;

        NSDictionary *appInfo = @{
            @"appName": [frontApp localizedName] ?: @"Unknown",
            @"appPID": @([frontApp processIdentifier]),
            @"bundleIdentifier": [frontApp bundleIdentifier] ?: @""
        };

        // Call the JavaScript callback on the main thread
        auto callback = [](Napi::Env env, Napi::Function jsCallback, NSDictionary *data) {
            Napi::Object info = Napi::Object::New(env);
            info.Set("appName", Napi::String::New(env, [[data objectForKey:@"appName"] UTF8String]));
            info.Set("appPID", Napi::Number::New(env, [[data objectForKey:@"appPID"] intValue]));
            info.Set("bundleIdentifier", Napi::String::New(env, [[data objectForKey:@"bundleIdentifier"] UTF8String]));
            jsCallback.Call({info});
        };

        if (tsfn) {
            tsfn.BlockingCall(appInfo, callback);
        }
    }
}

/**
 * Start monitoring active application changes
 *
 * Registers a callback that fires whenever the user switches to a
 * different application. Useful for detecting context changes.
 *
 * @param callback - Function(appInfo) called on app switch
 *   appInfo: {appName: String, appPID: Number, bundleIdentifier: String}
 * @return Boolean - true if monitoring started successfully
 */
Napi::Value StartMonitoringActiveApp(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Callback function required").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!AXIsProcessTrusted()) {
        Napi::Error::New(env, "Accessibility permissions not granted").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    Napi::Function callback = info[0].As<Napi::Function>();

    // Stop existing monitoring if any
    if (globalObserver) {
        CFRunLoopRemoveSource(
            CFRunLoopGetCurrent(),
            AXObserverGetRunLoopSource(globalObserver),
            kCFRunLoopDefaultMode
        );
        CFRelease(globalObserver);
        globalObserver = nullptr;
    }

    if (tsfn) {
        tsfn.Release();
    }

    @autoreleasepool {
        // Get current frontmost app
        NSRunningApplication *frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
        if (!frontApp) {
            return Napi::Boolean::New(env, false);
        }

        monitoredPID = [frontApp processIdentifier];

        // Create thread-safe function
        tsfn = Napi::ThreadSafeFunction::New(
            env,
            callback,
            "ActiveAppMonitor",
            0,
            1,
            [](Napi::Env) {}
        );

        // Create observer for system-wide notifications
        AXError error = AXObserverCreate(
            monitoredPID,
            activeApplicationChangedCallback,
            &globalObserver
        );

        if (error != kAXErrorSuccess) {
            tsfn.Release();
            return Napi::Boolean::New(env, false);
        }

        // Use NSWorkspace notification instead of AX for app switching
        [[NSWorkspace sharedWorkspace].notificationCenter
            addObserverForName:NSWorkspaceDidActivateApplicationNotification
            object:nil
            queue:nil
            usingBlock:^(NSNotification *note) {
                NSRunningApplication *app = [[note userInfo] objectForKey:NSWorkspaceApplicationKey];
                if (!app) return;

                NSDictionary *appInfo = @{
                    @"appName": [app localizedName] ?: @"Unknown",
                    @"appPID": @([app processIdentifier]),
                    @"bundleIdentifier": [app bundleIdentifier] ?: @""
                };

                auto callback = [](Napi::Env env, Napi::Function jsCallback, NSDictionary *data) {
                    Napi::Object info = Napi::Object::New(env);
                    info.Set("appName", Napi::String::New(env, [[data objectForKey:@"appName"] UTF8String]));
                    info.Set("appPID", Napi::Number::New(env, [[data objectForKey:@"appPID"] intValue]));
                    info.Set("bundleIdentifier", Napi::String::New(env, [[data objectForKey:@"bundleIdentifier"] UTF8String]));
                    jsCallback.Call({info});
                };

                if (tsfn) {
                    tsfn.BlockingCall(appInfo, callback);
                }
            }];
    }

    return Napi::Boolean::New(env, true);
}

/**
 * Stop monitoring active application changes
 *
 * Cleanup function to stop the monitoring started by startMonitoringActiveApp
 */
Napi::Value StopMonitoringActiveApp(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (globalObserver) {
        CFRunLoopRemoveSource(
            CFRunLoopGetCurrent(),
            AXObserverGetRunLoopSource(globalObserver),
            kCFRunLoopDefaultMode
        );
        CFRelease(globalObserver);
        globalObserver = nullptr;
    }

    if (tsfn) {
        tsfn.Release();
    }

    // Note: NSWorkspace notifications are managed by the system and don't need explicit removal

    return Napi::Boolean::New(env, true);
}

/**
 * Simulate Cmd+V paste operation
 *
 * This function simulates a global Cmd+V keypress using CGEvent APIs.
 * Works with ALL applications including terminals, browsers, and native apps.
 * More reliable than insertText() for universal paste support.
 *
 * Strategy:
 * 1. Create key-down event for Cmd
 * 2. Create key-down event for V (with Cmd modifier)
 * 3. Create key-up event for V
 * 4. Create key-up event for Cmd
 * 5. Post all events to the system
 *
 * @return Boolean - true if paste events were posted successfully
 */
Napi::Value SimulatePaste(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    @autoreleasepool {
        // Key code for 'V' key
        const CGKeyCode vKeyCode = 9;

        // Create key down event for Cmd
        CGEventRef cmdDown = CGEventCreateKeyboardEvent(NULL, (CGKeyCode)55, true);

        // Create key down event for V with Cmd modifier
        CGEventRef vDown = CGEventCreateKeyboardEvent(NULL, vKeyCode, true);
        CGEventSetFlags(vDown, kCGEventFlagMaskCommand);

        // Create key up event for V with Cmd modifier
        CGEventRef vUp = CGEventCreateKeyboardEvent(NULL, vKeyCode, false);
        CGEventSetFlags(vUp, kCGEventFlagMaskCommand);

        // Create key up event for Cmd
        CGEventRef cmdUp = CGEventCreateKeyboardEvent(NULL, (CGKeyCode)55, false);

        // Post events to system
        CGEventPost(kCGHIDEventTap, cmdDown);
        usleep(10000); // 10ms delay
        CGEventPost(kCGHIDEventTap, vDown);
        usleep(10000); // 10ms delay
        CGEventPost(kCGHIDEventTap, vUp);
        usleep(10000); // 10ms delay
        CGEventPost(kCGHIDEventTap, cmdUp);

        // Clean up
        CFRelease(cmdDown);
        CFRelease(vDown);
        CFRelease(vUp);
        CFRelease(cmdUp);
    }

    return Napi::Boolean::New(env, true);
}

/**
 * Module initialization
 *
 * Exports all accessibility functions to Node.js
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("hasAccessibilityPermissions", Napi::Function::New(env, HasAccessibilityPermissions));
    exports.Set("requestAccessibilityPermissions", Napi::Function::New(env, RequestAccessibilityPermissions));
    exports.Set("getFocusedElement", Napi::Function::New(env, GetFocusedElement));
    exports.Set("isTextInputElement", Napi::Function::New(env, IsTextInputElement));
    exports.Set("insertText", Napi::Function::New(env, InsertText));
    exports.Set("simulatePaste", Napi::Function::New(env, SimulatePaste));
    exports.Set("startMonitoringActiveApp", Napi::Function::New(env, StartMonitoringActiveApp));
    exports.Set("stopMonitoringActiveApp", Napi::Function::New(env, StopMonitoringActiveApp));

    return exports;
}

NODE_API_MODULE(accessibility, Init)
