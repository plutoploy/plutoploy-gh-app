FROM quay.io/almalinuxorg/almalinux:latest
WORKDIR /app
RUN curl https://mise.run | sh >> /dev/null
COPY . .
EXPOSE 3000
RUN $HOME/.local/bin/mise deps
RUN $HOME/.local/bin/mise run build
CMD [ "$HOME/.local/bin/mise", "run", "start" ]
