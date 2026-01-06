import arrow


def safeDateParse(dateString: str) -> arrow.Arrow:
    dateString = dateString.replace("EDT", "-04:00").replace("EST", "-05:00")
    return arrow.get(
        dateString,
        ["YYYY-MM-DD HH:mm:ss ZZ", "YYYY-MM-DD;HH:mm:ss ZZ", "YYYY-MM-DD"],
    )


def valueOrNone(value: str) -> str | None:
    if value == "":
        return None
    return value


def floatValueOrNone(value: str) -> float | None:
    if value == "":
        return None
    return float(value)


def dateValueOrNone(value: str) -> arrow.Arrow | None:
    if value == "":
        return None
    return safeDateParse(value)
