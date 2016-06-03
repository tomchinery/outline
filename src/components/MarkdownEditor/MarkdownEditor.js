import React from 'react';
import { observer } from 'mobx-react';
import Codemirror from 'react-codemirror';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/display/placeholder.js';
import Dropzone from 'react-dropzone';

import ClickablePadding from './components/ClickablePadding';

import styles from './MarkdownEditor.scss';
import './codemirror.scss';

import { client } from '../../utils/ApiClient';

@observer
class MarkdownAtlas extends React.Component {
  static propTypes = {
    text: React.PropTypes.string,
    onChange: React.PropTypes.func,
    replaceText: React.PropTypes.func,
  }

  getEditorInstance = () => {
    return this.refs.editor.getCodeMirror();
  }

  onChange = (newText) => {
    if (newText !== this.props.text) {
      this.props.onChange(newText);
    }
  }

  onDropAccepted = (files) => {
    const file = files[0];
    const editor = this.getEditorInstance();

    const cursorPosition = editor.getCursor();
    const insertOnNewLine = cursorPosition.ch !== 0;
    let newCursorPositionLine;

    // Lets set up the upload text
    const pendingUploadTag = `![${file.name}](Uploading...)`;
    if (insertOnNewLine) {
      editor.replaceSelection('\n' + pendingUploadTag + '\n');
      newCursorPositionLine = cursorPosition.line + 3;
    } else {
      editor.replaceSelection(pendingUploadTag + '\n');
      newCursorPositionLine = cursorPosition.line + 2;
    }
    editor.setCursor(newCursorPositionLine, 0);

    client.post('/user.s3Upload', {
      kind: file.type,
      size: file.size,
      filename: file.name,
    })
    .then(response => {
      const data = response.data;
      // Upload using FormData API
      let formData = new FormData();

      for (let key in data.form) {
        formData.append(key, data.form[key]);
      }

      if (file.blob) {
        formData.append('file', file.file);
      } else {
        formData.append('file', file);
      }

      fetch(data.upload_url, {
        method: 'post',
        body: formData
      })
      .then(s3Response => {
        this.props.replaceText({
          original: pendingUploadTag,
          new: `![${file.name}](${data.asset.url})`
        });
        editor.setCursor(newCursorPositionLine, 0);
      })
      .catch(err => {
        this.props.replaceText({
          original: pendingUploadTag,
          new: '',
        });
        editor.setCursor(newCursorPositionLine, 0);
      });
    });
  }

  onPaddingTopClick = () => {
    const cm = this.getEditorInstance();
    console.log(cm)
    cm.setCursor(0, 0);
    cm.focus();
  }

  onPaddingBottomClick = () => {
    const cm = this.getEditorInstance();
    cm.setCursor(cm.lineCount(), 0);
    cm.focus();
  }

  render = () => {
    const options = {
      readOnly: false,
      lineNumbers: false,
      mode: 'gfm',
      matchBrackets: true,
      lineWrapping: true,
      viewportMargin: Infinity,
      scrollbarStyle: 'null',
      theme: 'atlas',
      extraKeys: {
        Enter: 'newlineAndIndentContinueMarkdownList',
      },
      placeholder: "# Start with a title...",
    };

    // http://codepen.io/lubelski/pen/fnGae
    // TODO:
    // - Emojify
    return (
      <Dropzone
        onDropAccepted={this.onDropAccepted}
        disableClick={true}
        multiple={false}
        accept={'image/*'}
        className={styles.container}
      >
        <ClickablePadding onClick={ this.onPaddingTopClick } />
        <Codemirror
          value={this.props.text}
          onChange={this.onChange}
          options={options}
          ref="editor"
          className={styles.codeMirrorContainer}
        />
        <ClickablePadding onClick={ this.onPaddingBottomClick } />
      </Dropzone>
    );
  }
}

export default MarkdownAtlas;
