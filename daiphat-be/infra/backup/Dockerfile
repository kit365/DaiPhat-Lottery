FROM postgres:16-alpine

RUN apk add --no-cache coreutils restic tzdata

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod 0755 /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
CMD ["daemon"]
