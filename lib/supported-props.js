var html5 = 'accept acceptCharset accessKey action allowFullScreen allowTransparency alt \
async autoComplete autoPlay cellPadding cellSpacing charSet checked classID \
className cols colSpan content contentEditable contextMenu controls coords \
crossOrigin data dateTime defer dir disabled download draggable encType form \
formNoValidate frameBorder height hidden href hrefLang htmlFor httpEquiv icon \
id label lang list loop manifest max maxLength media mediaGroup method min \
multiple muted name noValidate open pattern placeholder poster preload \
radioGroup readOnly rel required role rows rowSpan sandbox scope scrolling \
seamless selected shape size sizes span spellCheck src srcDoc srcSet start step \
style tabIndex target title type useMap value width wmode'.split(' ');

var svg = 'cx cy d dx dy fill fillOpacity fontFamily fontSize fx fy gradientTransform \
gradientUnits markerEnd markerMid markerStart offset opacity \
patternContentUnits patternUnits points preserveAspectRatio r rx ry \
spreadMethod stopColor stopOpacity stroke strokeDasharray strokeLinecap \
strokeOpacity strokeWidth textAnchor transform version viewBox x1 x2 x y1 y2 y'.split(' ');

var nonStandard = 'autoCapitalize autoCorrect property itemProp itemScope itemType dangerouslySetInnerHTML'.split(' ');

var events = 'onCopy onCut onPaste onKeyDown onKeyPress onKeyUp onFocus onBlur onChange onInput onSubmit \
onClick onDoubleClick onDrag onDragEnd onDragEnter onDragExit onDragLeave \
onDragOver onDragStart onDrop onMouseDown onMouseEnter onMouseLeave \
onMouseMove onMouseOut onMouseOver onMouseUp onScroll onWheel \
onTouchCancel onTouchEnd onTouchMove onTouchStart'.split(' ');

module.exports = html5.concat(svg).concat(nonStandard).concat(events).sort();
