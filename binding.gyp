{
  "targets": [
    {
      "target_name": "accessibility",
      "sources": [
        "native/accessibility/accessibility.mm"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "12.0",
        "OTHER_CFLAGS": [
          "-fobjc-arc"
        ]
      },
      "link_settings": {
        "libraries": [
          "-framework AppKit",
          "-framework ApplicationServices",
          "-framework Carbon",
          "-framework CoreFoundation"
        ]
      }
    }
  ]
}
