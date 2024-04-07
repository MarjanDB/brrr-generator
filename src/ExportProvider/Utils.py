import arrow

def safeDateParse(dateString: str) -> arrow.Arrow:
     safeDateString = dateString.replace('EDT', 'UTC-4').replace('EST', 'UTC-5')
     return arrow.get(safeDateString, ['YYYY-MM-DD HH:mm:ss ZZZ', 'YYYY-MM-DD;HH:mm:ss ZZZ', 'YYYY-MM-DD'])

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