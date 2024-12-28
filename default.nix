with import <nixpkgs> { };
stdenv.mkDerivation {
  name = "faccina-compile";
  buildInputs = [
    pkg-config
    python313
    gcc
    gnumake
    pkg-config
    glib
    clang-tools
    vips
  ];
}
