import React, { useRef, useState } from 'react';
import { Button, Col, Form, Overlay, Row, Tooltip } from 'react-bootstrap';
import MDEditorCustom from '../../components/MDEditorCustom';
import { MappedSearchTagsResponse, QuestionCreateDTO, SearchTagsSortBy } from '@cloneoverflow/common';
import { SearchService } from '../../api/services/search.service';
import { QuestionService } from '../../api/services/question.service';
import { useNavigate } from 'react-router-dom';
import ErrorList from '../../components/errorlist/ErrorList';

const AskQuestion = () => {
  const [question, setQuestion] = useState<QuestionCreateDTO>({
    title: '',
    text: '',
    tags: [],
  });
  const [tag, setTag] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<MappedSearchTagsResponse[]>([]);
  const [errMsg, setErrMsg] = useState<string[] | null>();
  const tagInputTarget = useRef(null);
  const currTimeout = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  const getTagSuggestions = (tag: string) => {
    if (currTimeout.current) {
      clearTimeout(currTimeout.current);
    }

    currTimeout.current = setTimeout(async () => {
      await SearchService.searchTags({
        name: tag,
        pagination: {
          page: 0,
          pageSize: 6,
        },
        sortBy: SearchTagsSortBy.POPULAR,
      }).then((res) => {
        if (res.tags.length === 0) {
          setShowSuggestions(false);
          return;
        }
        setShowSuggestions(true);
        setSuggestedTags(res.tags);
      });
    }, 1000);
  };

  const renderTags = question.tags.map((tag, index) => {
    return <li key={index} className='tagItem'>
      <span>#{tag}</span>
      <button onClick={() => {
          setQuestion({
            ...question,
            tags: question.tags.filter((t) => t !== tag),
          });
        }}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </li>;
  });

  const suggestedTagList = [];

  for (let row = 0; row < suggestedTags.length; row += 3) {
    const tagItems = [];
    for (let col = 0; col < 3; col++) {
      const tag = suggestedTags[row + col];
      if (!tag) {
        break;
      }
      tagItems.push(
        <Col key={tag.id} className='tag-suggestion'>
          <div key={tag.id} className='item' onClick={() => {
            setTag('');
            setShowSuggestions(false);
            
            if (question.tags.includes(tag.name)) {
              return;
            }
            setQuestion({
              ...question,
              tags: [...question.tags, tag.name],
            });
          }}>
            <p className='tagName'>{tag.name}</p>
            <p className='tagRate'>Questions: {tag.questionsAmount}</p>
          </div>
        </Col>
      )
    }

    suggestedTagList.push(
      <Row key={row}>
        {tagItems}
      </Row>
    );
  }

  return ( 
    <div className="ask-question">
      <div className="content">
        <h1>Ask a question</h1>
        <Form onSubmit={async (e) => {
          e.preventDefault();
          await QuestionService.create(question).then(() => {
            navigate('/questions');
          }).catch((err) => {
            setErrMsg(err.response.data.error ?? ['Server error']);
          });
        }}>
          <Form.Group className='question-item'>
            <Form.Label htmlFor='title'>Title</Form.Label>
            <Form.Control id='title' type="text" placeholder="Enter title" value={question.title} onChange={(e) => {
              setQuestion({
                ...question,
                title: e.target.value,
              });
            }}/>
          </Form.Group>
          
          <Form.Group className='question-item'>
            <Form.Label htmlFor='body'>Body</Form.Label>
            <div className="md-editor" data-color-mode="light">
              <MDEditorCustom 
                id='body' 
                value={question.text} 
                onChange={(text) => {
                  setQuestion({
                    ...question,
                    text: text ?? '',
                  });
                }}
              />
            </div>
          </Form.Group>

          <Form.Group className='question-item'>
            <Form.Label>Tags</Form.Label>
            <Form.Control 
              ref={tagInputTarget} 
              type="text" 
              placeholder="Enter tags" 
              value={tag} 
              onBlur={() => {
                if (currTimeout.current) {
                  clearTimeout(currTimeout.current);
                }
                setShowSuggestions(false);
              }}
              onChange={async (e) => {
                setShowSuggestions(false);
                if (e.target.value.at(-1) === ' ') {
                  setTag('');
                  if (question.tags.includes(e.target.value.trim())) {
                    return;
                  }
                  setQuestion({
                    ...question,
                    tags: [...question.tags, tag.trim()],
                  });
                }
                else {
                  setTag(e.target.value);
                  getTagSuggestions(e.target.value);
                }
              }}
            />
            <Overlay target={tagInputTarget.current} show={showSuggestions} placement='bottom-start'>
              <Tooltip id='tags-suggestions' data-bs-theme="light">
                { suggestedTagList }
              </Tooltip>
            </Overlay>

            <div className="tags">
              <ul>
                { renderTags }
              </ul>
            </div>
          </Form.Group>

          <Form.Group>
            <ErrorList errors={errMsg}/>
          </Form.Group>

          <Button variant="primary" type="submit" className='btn-create-question'>Create question</Button>
        </Form>
      </div>
    </div>
  );
}
 
export default AskQuestion;