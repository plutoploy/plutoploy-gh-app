FROM docker.io/rockylinux/rockylinux:10-ubi-micro
WORKDIR /app
RUN curl https://mise.run | sh
COPY . .
EXPOSE 3000
RUN $HOME/.local/bin/mise deps
RUN $HOME/.local/bin/mise run build
CMD [ "$HOME/.local/bin/mise", "run", "start" ]
