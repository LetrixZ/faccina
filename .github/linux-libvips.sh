DEBIAN_FRONTEND=noninteractive apt-get update \
&& apt-get -y --no-install-recommends install unzip curl build-essential ninja-build python3-pip bc wget libfftw3-dev libopenexr-dev libgsf-1-dev libglib2.0-dev liborc-dev libopenslide-dev libmatio-dev libwebp-dev libjpeg-turbo8-dev libexpat1-dev libexif-dev libtiff5-dev libcfitsio-dev libpoppler-glib-dev librsvg2-dev libpango1.0-dev libopenjp2-7-dev liblcms2-dev libimagequant-dev
pip3 install meson
wget https://github.com/libvips/libvips/archive/refs/heads/master.zip && unzip master.zip
cd libvips-master
meson setup build --libdir=lib --buildtype=release --wipe
cd build && meson compile && meson install
ldconfig