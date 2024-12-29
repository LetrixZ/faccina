{
  inputs = {
    utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs, ... }@inputs:
    inputs.utils.lib.eachSystem
      [
        "x86_64-linux"
        "x86_64-darwin"
        "aarch64-linux"
        "aarch64-darwin"
      ]
      (
        system:
        let pkgs = nixpkgs.legacyPackages.${system};
        commonBuildInputs = [
              pkgs.bun
              pkgs.pkg-config
              pkgs.python313
              pkgs.gcc
              pkgs.clang-tools
              pkgs.gnumake
              pkgs.pkg-config
              pkgs.glib
              pkgs.vips
              pkgs.xz
            ];
        in
        {
          devShell = pkgs.mkShell {
            buildInputs = commonBuildInputs;
          };
        }
      );

}
